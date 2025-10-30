# Debugging Empty Message Blocks

This document describes the debugging tools added to troubleshoot empty message blocks appearing during streaming.

## Problem Description

Empty message blocks (divs with `w-full overflow-hidden` class) appear during streaming but not when loading the full JSONL file. This suggests an issue with how streaming messages are being processed.

## Debugging Tools Added

### 1. Debug Logging in ContentBlockRenderer

**File:** `apps/web/src/client/pages/projects/sessions/components/session/claude/ContentBlockRenderer.tsx`

**What it logs:**
- Every block being rendered with its type, content preview, and full structure
- Special warnings for empty text blocks
- Logs when tool_result or result blocks are skipped

**How to use:**
Open browser DevTools console and look for logs starting with `[ContentBlockRenderer]`

### 2. Debug Logging in sessionStore Enrichment

**File:** `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`

**What it logs in `enrichMessagesWithToolResults()`:**
- Total number of messages being enriched
- Which messages are filtered out as system messages
- Messages with no text blocks
- Tool result map building (how many tool_use_id mappings created)
- Processing of each message and its content blocks
- Empty content arrays (⚠️ WARNING)

**What it logs in `updateStreamingMessage()`:**
- Message ID, content block count and types
- Decision logic: whether to update existing message or create new one
- Message ID comparisons
- Total message count

**How to use:**
Open browser DevTools console and look for logs starting with:
- `[enrichMessagesWithToolResults]`
- `[sessionStore]`

### 3. Debug Logging in WebSocket Handler

**File:** `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

**What it logs in `handleStreamOutput()`:**
- Every stream_output event received
- Message structure: ID, role, content type, length, block types
- Validation warnings for non-array content
- Empty text block warnings
- Empty content array warnings

**How to use:**
Open browser DevTools console and look for logs starting with `[useSessionWebSocket]`

### 4. Debug Logging in TextBlock Component

**File:** `apps/web/src/client/pages/projects/sessions/components/session/claude/TextBlock.tsx`

**What it logs:**
- Every text block being rendered
- ⚠️ Warnings for empty or whitespace-only text blocks
- Text length and preview

**How to use:**
Open browser DevTools console and look for logs starting with `[TextBlock]`

### 5. Visual Debug Panel (NEW!)

**File:** `apps/web/src/client/pages/projects/sessions/components/session/DebugMessagePanel.tsx`

**Features:**
- Floating button in bottom-right corner (only in development)
- Shows statistics: total messages, streaming messages, empty messages, empty text blocks
- List view of all messages with visual indicators for problems
- Click to expand any message and see:
  - Message ID, timestamp, role
  - All content blocks with type and details
  - Warnings for empty text blocks
  - Tool use blocks and whether they have results
  - Raw JSON for deep inspection
- Color coding:
  - 🔴 Red: Empty messages or messages with empty text blocks
  - 🟡 Yellow: Streaming messages
  - 🔵 Blue: User messages
  - 🟢 Green: Assistant messages

**How to use:**
1. Start the dev server: `pnpm dev`
2. Open the chat interface
3. Look for the "🔍 Debug Panel" button in the bottom-right corner
4. Click to expand and see detailed message structure
5. Click on any message to see its full details

**Added to:** `MessageList.tsx` - automatically renders when in development mode

## Debugging Workflow

### Step 1: Reproduce the Issue
1. Start streaming a message
2. Watch for empty message blocks appearing in the UI

### Step 2: Check Browser Console
Look for these warning patterns:

```
[ContentBlockRenderer] EMPTY TEXT BLOCK DETECTED: {text: "", ...}
[enrichMessagesWithToolResults] WARNING: Message X has EMPTY content array!
[useSessionWebSocket] Message contains N empty text blocks
[TextBlock] RENDERING EMPTY TEXT BLOCK
```

### Step 3: Use Debug Panel
1. Click the "🔍 Debug Panel" button
2. Look at the statistics:
   - How many messages have empty content?
   - How many empty text blocks exist?
3. Click on messages marked in red to inspect their structure
4. Check the "Content Blocks" section to see what's actually in each message

### Step 4: Compare Streaming vs Loading
1. **During streaming:** Use the debug panel to see message structure in real-time
2. **After loading complete:** Refresh the page to load from JSONL
3. Compare the message structures - what's different?

### Step 5: Trace the Data Flow
Follow the logs in this order:
1. `[useSessionWebSocket] stream_output received` - What does the server send?
2. `[sessionStore] updateStreamingMessage` - How is it stored?
3. `[ContentBlockRenderer]` - How is it rendered?
4. `[TextBlock]` - What text is being displayed?

## Common Issues to Look For

### Issue 1: Empty Content Arrays
```javascript
// Message has no content blocks at all
{
  id: "msg_01ABC",
  role: "assistant",
  content: [],  // ⚠️ Empty!
  isStreaming: true
}
```

**Where to check:**
- `[enrichMessagesWithToolResults] WARNING: Message X has EMPTY content array!`
- Debug Panel shows "⚠️ EMPTY CONTENT: 1" in statistics

### Issue 2: Empty Text Blocks
```javascript
// Message has text blocks with empty strings
{
  id: "msg_01ABC",
  role: "assistant",
  content: [
    { type: "text", text: "" }  // ⚠️ Empty text!
  ]
}
```

**Where to check:**
- `[TextBlock] RENDERING EMPTY TEXT BLOCK`
- Debug Panel shows "Empty Text Blocks: 5"
- Click on message in debug panel to see which blocks are empty

### Issue 3: Tool Results Not Enriched (Loading Only)
```javascript
// tool_result not nested into tool_use during enrichment
// This should only happen during streaming, not after loading
```

**Where to check:**
- `[enrichMessagesWithToolResults] tool_use "Read", result found: false`
- Debug panel shows tool_use blocks without results

### Issue 4: Multiple Messages Replacing Each Other (Streaming)
```javascript
// Multiple assistant messages with different IDs
// but only one appears (messages are replacing instead of appending)
```

**Where to check:**
- `[sessionStore] updateStreamingMessage decision`
- `shouldUpdateLastMessage: true` when it should be `false`
- `lastMessageId !== incomingMessageId` but still updating

## Expected Behavior

### During Streaming:
- Each `stream_output` event should either:
  - **Update** the existing message (same message ID)
  - **Create** a new message (different message ID)
- Messages should never have empty content arrays
- Text blocks may be empty during initial streaming (before content arrives)

### After Loading JSONL:
- All messages should be enriched with tool results
- No empty content arrays
- No empty text blocks (unless intentional)
- tool_result blocks should be nested into tool_use blocks

## Removing Debug Code

When debugging is complete, you can:

1. **Keep the debug panel** - it only renders in development and is useful for future debugging
2. **Remove console.log statements** - search for `if (import.meta.env.DEV)` and remove unneeded logs
3. **Keep warning logs** - `console.warn()` statements are useful for catching regressions

To quickly disable all debug logs without removing them:
```typescript
// Add at top of each file
const DEBUG = false;

// Change all debug logs to:
if (import.meta.env.DEV && DEBUG) {
  console.log(...);
}
```

## Testing Notes

The test file `updateStreamingMessage.test.ts` documents the expected behavior:
- Messages with different IDs should append as separate messages
- Messages with the same ID should update the existing message
- This is already implemented correctly in the store

If the bug persists, the issue is likely:
1. **Server sending wrong data** - check WebSocket logs
2. **SDK transforming data incorrectly** - check agent-cli-sdk package
3. **Enrichment filtering too aggressively** - check enrichMessagesWithToolResults logs

## Additional Resources

- Tool result pattern docs: `.agent/docs/claude-tool-result-patterns.md`
- Session store docs: See JSDoc comments in `sessionStore.ts`
- WebSocket event flow: See JSDoc in `useSessionWebSocket.ts`
