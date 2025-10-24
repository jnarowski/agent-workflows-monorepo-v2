# Bug: Assistant Messages Replacing Instead of Appending During Streaming

## Issue Description

When Claude sends a response, it streams multiple separate assistant messages (e.g., first message with a "Read" tool, second message with a "Glob" tool). Currently, these messages **replace each other** instead of appearing as separate messages in the UI.

### Current Behavior (Bug)
- User submits a question
- First streaming message arrives with "Read" tool → displays in UI
- Second streaming message arrives with "Glob" tool → **replaces** the "Read" message
- Only one message visible at a time

### Expected Behavior
- First streaming message arrives with "Read" tool → displays in UI
- Second streaming message arrives with "Glob" tool → **appends** as new message below "Read"
- Both messages visible simultaneously

### Why It Works After Page Reload
After page reload, messages are loaded from the JSONL file where they are stored as separate entries. The `transformMessages` function correctly loads them as individual messages, so all messages display properly.

## Root Cause

**File:** `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`

**Function:** `updateStreamingMessage` (lines 196-246)

The logic treats ALL streaming content as updates to the same message:

```typescript
const canUpdateLastMessage =
  lastMessage &&
  lastMessage.role === "assistant" &&
  lastMessage.isStreaming === true;

if (canUpdateLastMessage) {
  // PROBLEM: This updates the existing message
  return {
    currentSession: {
      ...state.currentSession,
      messages: [
        ...messages.slice(0, -1),
        {
          ...lastMessage,
          content: contentBlocks, // Replaces old content
        },
      ],
    },
  };
}
```

The issue: When a new assistant message arrives during streaming, it sees the last message has `isStreaming: true`, so it **updates** that message's content instead of creating a new message.

## Test Coverage

**Test File:** `apps/web/src/client/pages/projects/sessions/stores/updateStreamingMessage.test.ts`

Run with: `pnpm test updateStreamingMessage`

The test demonstrates the bug:
- Creates first streaming message with "Read" tool
- Creates second streaming message with "Glob" tool
- Confirms only 1 message exists (Read was replaced)

## Solution Options

### Option 1: Track Message IDs (Recommended)

Each assistant message from Claude has a unique `id` field. We should:

1. **Modify `transformStreaming()`** to return message metadata:
   ```typescript
   // Currently returns: ContentBlock[]
   // Should return: { id: string, content: ContentBlock[] }
   ```
   **File:** `apps/web/src/client/lib/agents/claude/transformStreaming.ts`

2. **Update `updateStreamingMessage()`** to track message IDs:
   ```typescript
   updateStreamingMessage: (messageId: string, contentBlocks: ContentBlock[]) => {
     // If messageId differs from last message's ID → create NEW message
     // If messageId matches → update existing message
   }
   ```
   **File:** `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`

3. **Update `useSessionWebSocket`** to pass message ID:
   ```typescript
   const { id, content } = agent.transformStreaming(data);
   useSessionStore.getState().updateStreamingMessage(id, content);
   ```
   **File:** `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

### Option 2: Finalize Previous Message (Alternative)

Before creating a new streaming message, finalize the previous one:
- Simpler implementation
- May cause visual flicker as messages finalize/create
- Doesn't handle true incremental updates to same message

## Files to Modify

1. **`apps/web/src/client/lib/agents/claude/transformStreaming.ts`**
   - Return `{ id, content }` instead of just `content`
   - Extract `event.message.id` from assistant events
   - Update return type

2. **`apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`**
   - Update `updateStreamingMessage` signature to accept message ID
   - Add logic to compare message IDs
   - Create new message if ID differs, update if same

3. **`apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`**
   - Destructure both `id` and `content` from `transformStreaming`
   - Pass both to `updateStreamingMessage`

4. **Update tests:**
   - `apps/web/src/client/lib/agents/claude/transformStreaming.test.ts`
   - `apps/web/src/client/pages/projects/sessions/stores/updateStreamingMessage.test.ts`

## Verification Steps

1. Run the test to confirm it currently passes (demonstrating the bug):
   ```bash
   pnpm test updateStreamingMessage
   ```

2. After implementing the fix, update the test assertions to expect 2 messages:
   ```typescript
   expect(messages).toHaveLength(2);
   expect((messages[0].content[1] as any).name).toBe("Read");
   expect((messages[1].content[1] as any).name).toBe("Glob");
   ```

3. Test should pass, confirming the fix works

4. Manual testing:
   - Submit a question that triggers multiple tool calls
   - Verify each tool appears as a separate message (not replacing)
   - Verify behavior matches post-reload state

## Additional Context

- The bug only affects streaming; persisted messages work correctly
- Claude CLI sends complete messages per stream event, not incremental deltas
- Each assistant message has a unique ID that we're currently discarding
- The WebSocket event is `session.${sessionId}.stream_output`
