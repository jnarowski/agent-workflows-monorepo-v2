# Frontend Kill Feature Integration

**Status**: draft
**Created**: 2025-01-31
**Package**: apps/web
**Estimated Effort**: 2-3 hours

## Overview

Integrate the existing backend kill infrastructure into the frontend chat interface by adding an Escape key handler that triggers session cancellation. When a user presses Escape while an agent is streaming, the system will kill the running Claude process, display a system message confirming the action, and return the session to idle state.

## User Story

As a user
I want to press Escape to stop a running agent session
So that I can immediately halt unwanted or long-running operations without waiting for completion

## Technical Approach

Wire up the Escape key in the chat input to send a `SessionEventTypes.CANCEL` WebSocket event. The backend infrastructure (kill process logic, session state management) is already complete. This spec focuses purely on the frontend trigger and UI feedback.

## Key Design Decisions

1. **Escape Key Trigger**: Use Escape key (standard "cancel" action) rather than a button, providing immediate keyboard access during streaming
2. **Session State Check**: Only trigger kill when `isStreaming === true` to prevent accidental cancellations on idle sessions
3. **Temporary System Message**: Add a visual confirmation message to the chat ("🛑 Session stopped by user") for user feedback
4. **Reuse Backend Cancel Handler**: Leverage existing `handleSessionCancel` in session handler - no backend changes needed

## Architecture

### File Structure

```
apps/web/src/client/pages/projects/sessions/
├── components/
│   └── ChatPromptInput.tsx           # Pass killSession callback
├── hooks/
│   ├── usePromptInputState.ts        # Add Escape handler
│   └── useSessionWebSocket.ts        # Add killSession function
└── stores/
    └── sessionStore.ts               # Existing addMessage() supports system messages
```

### Integration Points

**Chat Input Layer**:
- `ChatPromptInput.tsx` - Retrieve `killSession` from WebSocket hook and pass to input state hook
- `usePromptInputState.ts` - Add Escape key detection and call `onKill` callback

**WebSocket Layer**:
- `useSessionWebSocket.ts` - Implement `killSession()` function that sends CANCEL event and updates UI

**Backend (No Changes)**:
- `apps/web/src/server/websocket/handlers/session.handler.ts` - Already has `handleSessionCancel`
- `packages/agent-cli-sdk/src/utils/kill.ts` - Already has `killProcess()`

## Implementation Details

### 1. Escape Key Handler in usePromptInputState

Add Escape key detection to the `handleKeyDown` function. The handler should:
- Check if `status === "streaming"` (only kill active sessions)
- Call `onKill?.()` callback if provided
- Prevent default Escape behavior
- Return early to avoid other handlers

**Key Points**:
- Add before existing keyboard shortcuts (Enter, Tab)
- Only fires during streaming state
- Non-blocking - won't interfere with other input behaviors

### 2. killSession Function in useSessionWebSocket

Create a new `killSession` callback function that:
- Sends `SessionEventTypes.CANCEL` WebSocket message to backend
- Adds temporary system message to session store
- Updates streaming state to false
- Uses `useCallback` for stable reference

**Key Points**:
- Message format: `{ type: SessionEventTypes.CANCEL, data: { sessionId } }`
- System message uses `isError: true` for styling differentiation
- Optimistically updates UI before backend confirmation

### 3. Wire Up in ChatPromptInput

Pass `sessionId` and `projectId` from parent component to enable WebSocket access. Retrieve `killSession` from `useSessionWebSocket` and pass as `onKill` prop to `usePromptInputState`.

**Key Points**:
- May require parent component updates to pass session/project IDs
- Ensure IDs are available before rendering ChatPromptInput
- Handle edge case where WebSocket is disconnected

## Files to Create/Modify

### New Files (0)

None - all changes are modifications to existing files

### Modified Files (3)

1. `apps/web/src/client/pages/projects/sessions/hooks/usePromptInputState.ts` - Add Escape key handler and onKill callback
2. `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Add killSession function
3. `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` - Wire up killSession callback to input state

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Add Escape Key Handler

<!-- prettier-ignore -->
- [ ] kill-1.1 Add `onKill?: () => void` to `UsePromptInputStateParams` interface
  - File: `apps/web/src/client/pages/projects/sessions/hooks/usePromptInputState.ts` (line ~13)
  - Add the optional callback parameter to the params interface

- [ ] kill-1.2 Add Escape key detection in `handleKeyDown` function
  - File: `apps/web/src/client/pages/projects/sessions/hooks/usePromptInputState.ts` (line ~122)
  - Add at the beginning of `handleKeyDown`, before Enter key handling:
    ```typescript
    // Escape to stop streaming
    if (e.key === "Escape" && status === "streaming") {
      e.preventDefault();
      onKill?.();
      return;
    }
    ```

- [ ] kill-1.3 Add `onKill` to dependency array if needed
  - File: `apps/web/src/client/pages/projects/sessions/hooks/usePromptInputState.ts` (line ~139)
  - Check if `onKill` needs to be in `handleKeyDown`'s useCallback dependencies (likely not, as it's optional)

- [ ] kill-1.4 Return `stop` function if not already exposed
  - File: `apps/web/src/client/pages/projects/sessions/hooks/usePromptInputState.ts` (line ~308)
  - Verify `stop` function is in the return object (should already be there from line 44)

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: Add killSession Function to WebSocket Hook

<!-- prettier-ignore -->
- [ ] kill-2.1 Import `generateUUID` utility
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` (line ~12)
  - Already imported - verify it's available

- [ ] kill-2.2 Import `SessionEventTypes` and `Channels`
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` (line ~9)
  - Already imported - verify they're available

- [ ] kill-2.3 Create `killSession` callback function
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` (after `sendMessage` function, around line ~315)
  - Implementation:
    ```typescript
    /**
     * Kill the running agent session
     * Sends cancel event and updates UI immediately
     */
    const killSession = useCallback(() => {
      const currentSessionId = sessionIdRef.current;

      if (!currentSessionId) {
        console.error('[useSessionWebSocket] Cannot kill session: no sessionId');
        return;
      }

      const channel = Channels.session(currentSessionId);

      // Send cancel event to backend
      sendWsMessage(channel, {
        type: SessionEventTypes.CANCEL,
        data: { sessionId: currentSessionId },
      });

      // Add system message to UI
      useSessionStore.getState().addMessage({
        id: generateUUID(),
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '🛑 Session stopped by user',
          },
        ],
        timestamp: Date.now(),
        isError: true,
      });

      // Update streaming state
      useSessionStore.getState().setStreaming(false);
    }, [sendWsMessage]);
    ```

- [ ] kill-2.4 Return `killSession` from hook
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` (line ~316)
  - Add to return object: `return { readyState, isConnected, sendMessage, killSession };`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 3: Wire Up in ChatPromptInput

<!-- prettier-ignore -->
- [ ] kill-3.1 Identify where sessionId and projectId are available
  - File: `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
  - Check if parent component (ProjectSession.tsx or similar) has access to these IDs
  - Note: May need to trace up component tree to find where useSessionWebSocket is called

- [ ] kill-3.2 Get killSession from useSessionWebSocket hook
  - File: Likely in the parent component that renders ChatPromptInput
  - Destructure `killSession` from the hook return value
  - Example: `const { sendMessage, killSession } = useSessionWebSocket({ sessionId, projectId });`

- [ ] kill-3.3 Pass killSession as onKill prop
  - File: `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` (or parent)
  - Add `onKill` to props interface: `onKill?: () => void;`
  - Pass to `usePromptInputState`: `onKill: onKill`

- [ ] kill-3.4 Update TypeScript types if needed
  - File: `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` (line ~36)
  - Add `onKill?: () => void;` to `ChatPromptInputProps` interface if passing from parent

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 4: Testing and Verification

<!-- prettier-ignore -->
- [ ] kill-4.1 Manual test: Escape during streaming
  - Start dev server: `pnpm dev`
  - Navigate to a project session
  - Send a message to Claude
  - Press Escape while agent is streaming
  - Verify: System message appears, streaming stops, session state becomes idle

- [ ] kill-4.2 Manual test: Escape when not streaming
  - Navigate to a project session
  - Press Escape while idle
  - Verify: Nothing happens (no errors, no messages)

- [ ] kill-4.3 Manual test: Backend process kill
  - Check server logs while killing: `tail -f apps/web/logs/app.log`
  - Trigger kill with Escape key
  - Verify: Log shows "Killing agent process" and "Session cancelled successfully"

- [ ] kill-4.4 Test error handling
  - Kill WebSocket connection (browser DevTools)
  - Try pressing Escape
  - Verify: Graceful handling (error logged, no crash)

- [ ] kill-4.5 Test across permission modes
  - Try kill in "default" mode
  - Try kill in "acceptEdits" mode
  - Try kill in "bypassPermissions" mode
  - Verify: Works consistently across all modes

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

Testing is primarily manual for this feature due to WebSocket and keyboard event complexity. Consider adding tests if time permits:

**`usePromptInputState.test.ts`** - Test Escape key handler:

```typescript
describe('usePromptInputState - Escape key', () => {
  it('calls onKill when Escape pressed during streaming', () => {
    const onKill = vi.fn();
    const { result } = renderHook(() => usePromptInputState({
      controller,
      permissionMode: 'default',
      onPermissionModeChange: vi.fn(),
      textareaRef: { current: null },
      onKill,
    }));

    // Set status to streaming
    act(() => result.current.setStatus('streaming'));

    // Simulate Escape key
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    act(() => result.current.handleKeyDown(event as any));

    expect(onKill).toHaveBeenCalledOnce();
  });

  it('does NOT call onKill when Escape pressed while idle', () => {
    const onKill = vi.fn();
    const { result } = renderHook(() => usePromptInputState({
      controller,
      permissionMode: 'default',
      onPermissionModeChange: vi.fn(),
      textareaRef: { current: null },
      onKill,
    }));

    // Status is 'ready' by default

    // Simulate Escape key
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    act(() => result.current.handleKeyDown(event as any));

    expect(onKill).not.toHaveBeenCalled();
  });
});
```

### Integration Tests

Not applicable - this feature is tightly coupled to browser events and WebSocket connections.

### E2E Tests

**`e2e/sessions/kill-session.test.ts`** - End-to-end kill test (optional):

```typescript
test('kill session with Escape key', async ({ page }) => {
  // Navigate to session
  await page.goto('/projects/test-project/sessions/test-session');

  // Send message to start streaming
  await page.fill('[data-testid="chat-input"]', 'List all files');
  await page.press('[data-testid="chat-input"]', 'Enter');

  // Wait for streaming to start
  await page.waitForSelector('[data-streaming="true"]');

  // Press Escape
  await page.press('[data-testid="chat-input"]', 'Escape');

  // Verify system message appears
  await expect(page.locator('text=Session stopped by user')).toBeVisible();

  // Verify streaming stopped
  await expect(page.locator('[data-streaming="true"]')).not.toBeVisible();
});
```

## Success Criteria

- [ ] Escape key triggers kill when session is streaming
- [ ] Escape key does nothing when session is idle
- [ ] System message "🛑 Session stopped by user" appears in chat
- [ ] Session state updates to idle after kill
- [ ] Backend process is killed (verified in logs)
- [ ] No console errors during kill operation
- [ ] Kill works across all permission modes (default, acceptEdits, bypassPermissions, plan)
- [ ] Kill gracefully handles disconnected WebSocket
- [ ] TypeScript compiles without errors
- [ ] No duplicate kill requests sent

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/[project-id]/sessions/[session-id]`
3. Send a message that will take time (e.g., "List all TypeScript files in this project")
4. While agent is streaming, press Escape
5. Verify:
   - System message "🛑 Session stopped by user" appears
   - Streaming indicator disappears
   - Input is re-enabled
   - No console errors
6. Check backend logs: `tail -f apps/web/logs/app.log`
   - Should see: "Killing agent process" and "Session cancelled successfully"

**Feature-Specific Checks:**

- Test Escape while idle (should do nothing)
- Test rapid Escape presses (should handle gracefully, no duplicate kills)
- Test with different message types (text, images, slash commands)
- Test across different browsers (Chrome, Firefox, Safari)
- Verify mobile/tablet behavior if applicable

## Implementation Notes

### 1. WebSocket Event Flow

The kill flow follows this sequence:
1. Frontend: User presses Escape
2. Frontend: `killSession()` sends `SessionEventTypes.CANCEL` event
3. Backend: `handleSessionCancel()` receives event
4. Backend: `killProcess()` sends SIGTERM/SIGKILL to Claude process
5. Backend: Updates database session state to "idle"
6. Backend: Broadcasts `SessionEventTypes.SESSION_UPDATED` event
7. Frontend: Receives update, confirms session is idle

### 2. Optimistic UI Update

The frontend optimistically adds the system message and stops streaming before receiving backend confirmation. This provides immediate feedback. If the backend kill fails, the error handler will display an additional error message.

### 3. Process Kill Behavior

The `killProcess()` function (from agent-cli-sdk) uses graceful shutdown:
- First sends SIGTERM (graceful shutdown)
- Waits 5 seconds for process to exit
- If still running, sends SIGKILL (force kill)
- Always cleans up process reference from active sessions

### 4. Edge Cases Handled

- **No session ID**: Function logs error and returns early
- **WebSocket disconnected**: Backend will handle when reconnected (session state is persisted)
- **Process already dead**: Backend detects this and updates state to idle anyway
- **Rapid Escape presses**: useCallback ensures stable reference, prevents duplicate sends

## Dependencies

- No new dependencies required
- Uses existing:
  - `@repo/agent-cli-sdk` (killProcess function)
  - `@/shared/websocket` (SessionEventTypes, Channels)
  - `@/client/lib/utils` (generateUUID)

## Timeline

| Task                     | Estimated Time |
| ------------------------ | -------------- |
| Add Escape Key Handler   | 30 minutes     |
| Add killSession Function | 45 minutes     |
| Wire Up in ChatPromptInput | 45 minutes   |
| Testing and Verification | 1 hour         |
| **Total**                | **2-3 hours**  |

## References

- Backend kill implementation: `apps/web/src/server/websocket/handlers/session.handler.ts:242-393`
- Kill process utility: `packages/agent-cli-sdk/src/utils/kill.ts`
- WebSocket types: `apps/web/src/shared/websocket/types.ts`
- Session store: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`

## Next Steps

1. Read this spec thoroughly
2. Execute Task Group 1: Add Escape Key Handler
3. Execute Task Group 2: Add killSession Function
4. Execute Task Group 3: Wire Up in ChatPromptInput
5. Execute Task Group 4: Testing and Verification
6. Run validation commands
7. Test manually across browsers and edge cases
8. Mark spec as completed: `/move-spec 26 done`
