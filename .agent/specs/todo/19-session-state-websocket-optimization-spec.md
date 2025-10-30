# Session State WebSocket Optimization

**Status**: draft
**Created**: 2025-10-30
**Package**: apps/web
**Estimated Effort**: 3-4 hours

## Overview

Optimize session state updates by sending real-time WebSocket events instead of invalidating and refetching all projects. Currently, when a session state changes (idle → working → idle/error), the frontend invalidates the entire projects cache and refetches ALL projects with their sessions (~50-500 KB). This spec implements direct cache updates using WebSocket events, eliminating unnecessary API calls and improving real-time responsiveness.

## User Story

As a user
I want to see session state changes (idle/working/error) update instantly in the sidebar
So that I always know the current status of my agent sessions without delays or unnecessary data transfers

## Technical Approach

Replace query invalidation with direct React Query cache updates triggered by WebSocket events. When session state changes on the backend, send a `session.{id}.updated` WebSocket message containing the updated session data. The frontend receives this event and directly updates the cached session within the `projectKeys.withSessions()` query, avoiding a full refetch.

## Key Design Decisions

1. **Generic `session.updated` event**: Use a single event type for all session updates (state, metadata, name) instead of separate events for each field. This is more extensible and reduces event handler complexity.

2. **Direct cache updates via `setQueryData`**: Update the React Query cache directly instead of invalidating. This provides instant UI updates without network round-trips.

3. **Revert default session state to 'idle'**: Sessions should start as 'idle' and only transition to 'working' when actively processing. The WebSocket handler already manages state transitions correctly.

4. **Backward compatibility**: Keep existing query invalidation as fallback for cases where WebSocket update fails or session data is complex.

## Architecture

### File Structure

```
apps/web/
├── src/
│   ├── server/
│   │   ├── websocket/
│   │   │   └── handlers/
│   │   │       └── session.handler.ts (send session.updated events)
│   │   ├── services/
│   │   │   └── agentSession.ts (revert default state)
│   │   └── websocket.types.ts (add SessionUpdatedData type)
│   │
│   ├── client/
│   │   └── pages/
│   │       └── projects/
│   │           └── sessions/
│   │               └── hooks/
│   │                   └── useSessionWebSocket.ts (handle session.updated)
│   │
│   └── shared/
│       └── types/
│           └── agent-session.types.ts (existing SessionResponse type)
```

### Integration Points

**Backend (WebSocket Handler)**:
- `session.handler.ts` - Add `sendMessage()` calls after state changes
- `websocket.types.ts` - Add `SessionUpdatedData` interface

**Backend (Services)**:
- `agentSession.ts` - Revert default state to 'idle' (line 401)

**Frontend (WebSocket Hook)**:
- `useSessionWebSocket.ts` - Add `handleSessionUpdated()` handler
- Update cache with `queryClient.setQueryData()`

**Frontend (Query Keys)**:
- `useProjects.ts` - Already exports `projectKeys.withSessions()`

## Implementation Details

### 1. Backend WebSocket Events

Send `session.{sessionId}.updated` events after every session state change in `session.handler.ts`.

**Key Points**:
- Send after setting state to 'working' (line 94)
- Send after setting state to 'idle' (line 142)
- Send after setting state to 'error' (line 346)
- Include minimal data: `id`, `state`, `error_message`, `metadata`, `name`, `updated_at`
- Use existing `sendMessage()` helper function

### 2. Backend Type Definitions

Add `SessionUpdatedData` interface to `websocket.types.ts` for type safety.

**Key Points**:
- Extends partial `SessionResponse` type
- All fields optional except `id` (allows partial updates)
- Matches the data structure sent via WebSocket

### 3. Frontend WebSocket Handler

Add event listener for `session.{sessionId}.updated` in `useSessionWebSocket.ts`.

**Key Points**:
- Use `useCallback` to prevent unnecessary re-registrations
- Update cache with `queryClient.setQueryData()`
- Map over projects to find matching project
- Map over sessions to find matching session
- Merge updated data with existing session data
- Handle case where project or session not found in cache

### 4. Revert Default Session State

Change default session state from 'working' back to 'idle' in `agentSession.ts`.

**Key Points**:
- Line 401: Change `state: 'working'` to `state: 'idle'`
- Sessions should only be 'working' when actively processing
- WebSocket handler already manages transitions correctly

## Files to Create/Modify

### New Files (0)

No new files required.

### Modified Files (3)

1. `apps/web/src/server/websocket/handlers/session.handler.ts` - Add WebSocket `session.updated` events after state changes
2. `apps/web/src/server/websocket.types.ts` - Add `SessionUpdatedData` interface
3. `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Handle `session.updated` events with direct cache updates

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Backend - Add WebSocket Type Definitions

<!-- prettier-ignore -->
- [ ] session-ws-types Add `SessionUpdatedData` interface to websocket types
  - Add interface extending partial SessionResponse
  - File: `apps/web/src/server/websocket.types.ts`
  - Add after existing interfaces:
    ```typescript
    export interface SessionUpdatedData {
      id: string;
      state?: SessionState;
      error_message?: string | null;
      metadata?: Record<string, unknown>;
      name?: string;
      updated_at?: Date | string;
    }
    ```

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: Backend - Send WebSocket Events After State Changes

<!-- prettier-ignore -->
- [ ] session-ws-working Send `session.updated` event after setting state to 'working'
  - Add after line 94 in handleSessionSendMessage()
  - File: `apps/web/src/server/websocket/handlers/session.handler.ts`
  - Add WebSocket message:
    ```typescript
    sendMessage(socket, `session.${sessionId}.updated`, {
      id: sessionId,
      state: 'working',
      error_message: null,
      updated_at: new Date(),
    } satisfies SessionUpdatedData);
    ```

- [ ] session-ws-idle Send `session.updated` event after setting state to 'idle'
  - Add after line 142 in handleSessionSendMessage()
  - File: `apps/web/src/server/websocket/handlers/session.handler.ts`
  - Add WebSocket message:
    ```typescript
    sendMessage(socket, `session.${sessionId}.updated`, {
      id: sessionId,
      state: 'idle',
      error_message: null,
      metadata: session.metadata as Record<string, unknown>,
      name: session.name,
      updated_at: new Date(),
    } satisfies SessionUpdatedData);
    ```

- [ ] session-ws-error Send `session.updated` event after setting state to 'error'
  - Add after line 346 in handleExecutionFailure()
  - File: `apps/web/src/server/websocket/handlers/session.handler.ts`
  - Add WebSocket message:
    ```typescript
    sendMessage(socket, `session.${sessionId}.updated`, {
      id: sessionId,
      state: 'error',
      error_message: errorMessage,
      updated_at: new Date(),
    } satisfies SessionUpdatedData);
    ```

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 3: Backend - Revert Default Session State

<!-- prettier-ignore -->
- [ ] session-state-default Revert default session state to 'idle'
  - Change line 401 in createSession()
  - File: `apps/web/src/server/services/agentSession.ts`
  - Change from `state: 'working'` to `state: 'idle'`
  - Reason: Sessions should start idle, only go to 'working' when processing

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 4: Frontend - Handle WebSocket Session Updates

<!-- prettier-ignore -->
- [ ] session-ws-handler Add `handleSessionUpdated` callback to process session updates
  - Add after existing handlers in useSessionWebSocket.ts
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
  - Import projectKeys: `import { projectKeys } from '@/client/pages/projects/hooks/useProjects';`
  - Add handler:
    ```typescript
    const handleSessionUpdated = useCallback((data: Partial<SessionResponse>) => {
      console.log("[useSessionWebSocket] session.updated received:", data);

      // Update cached session data directly (no refetch)
      queryClient.setQueryData<ProjectWithSessions[]>(
        projectKeys.withSessions(),
        (old) => {
          if (!old) return old;

          return old.map(project => {
            // Find project containing this session
            if (project.id !== projectIdRef.current) return project;

            // Update the matching session
            return {
              ...project,
              sessions: project.sessions.map(session =>
                session.id === sessionIdRef.current
                  ? { ...session, ...data, updated_at: new Date(data.updated_at || Date.now()) }
                  : session
              ),
            };
          });
        }
      );
    }, [queryClient]);
    ```

- [ ] session-ws-listener Register event listener for `session.updated` events
  - Add to existing useEffect in useSessionWebSocket.ts (around line 186)
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
  - Register listener:
    ```typescript
    const sessionUpdatedEvent = `session.${sessionId}.updated`;
    eventBus.on(sessionUpdatedEvent, handleSessionUpdated);
    ```
  - Add cleanup in return statement:
    ```typescript
    eventBus.off(sessionUpdatedEvent, handleSessionUpdated);
    ```

- [ ] session-ws-remove-invalidation Remove redundant query invalidation
  - Remove or comment out sessionKeys.byProject() invalidation
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
  - Line 145: Remove this line (it's a no-op since no queries use that key):
    ```typescript
    // queryClient.invalidateQueries({ queryKey: sessionKeys.byProject(projectIdRef.current) });
    ```
  - Keep projectKeys.withSessions() invalidation as fallback for message_complete

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

No new unit tests required. This is an optimization of existing functionality that maintains the same external behavior.

### Integration Tests

**Manual Integration Testing**:

1. **State Transition Test (Working → Idle)**:
   - Open app, navigate to a project
   - Create new session and send a message
   - Verify sidebar shows "Processing" badge immediately
   - Wait for message to complete
   - Verify sidebar shows no badge (idle state) immediately
   - Check Network tab: Should see WebSocket messages, NO new API calls to `/api/projects`

2. **State Transition Test (Working → Error)**:
   - Send a message that will fail (e.g., invalid command)
   - Verify sidebar shows "Processing" badge
   - Wait for error
   - Verify sidebar shows error badge with tooltip
   - Check Network tab: Should see WebSocket messages, NO new API calls

3. **Multi-Session Test**:
   - Create multiple sessions in same project
   - Send messages to different sessions
   - Verify only the active session's state updates in sidebar
   - Other sessions should remain unchanged

4. **WebSocket Reconnection Test**:
   - Start a session message
   - Kill WebSocket connection (DevTools → Network → WS → disconnect)
   - Reconnect WebSocket
   - Verify state still updates correctly (fallback to query invalidation)

### E2E Tests

Consider adding E2E test to verify real-time state updates:

**`apps/web/tests/e2e/session-state-updates.test.ts`**:

```typescript
test('session state updates in real-time via WebSocket', async ({ page }) => {
  // Navigate to project
  await page.goto('/projects/test-project-id');

  // Create session and send message
  await page.click('[data-testid="new-session-button"]');
  await page.fill('[data-testid="chat-input"]', 'test message');
  await page.click('[data-testid="send-button"]');

  // Verify "Processing" badge appears immediately
  await expect(page.locator('[data-testid="session-state-badge"]')).toContainText('Processing');

  // Wait for completion (timeout 30s)
  await expect(page.locator('[data-testid="session-state-badge"]')).not.toBeVisible({ timeout: 30000 });

  // Verify no API calls to /api/projects were made (only WebSocket messages)
  const apiCalls = page.requests().filter(req => req.url().includes('/api/projects'));
  expect(apiCalls.length).toBe(1); // Only initial load, no refetch
});
```

## Success Criteria

- [ ] Sessions start with 'idle' state (not 'working')
- [ ] Session state changes trigger WebSocket `session.updated` events
- [ ] Frontend receives events and updates cache directly without API calls
- [ ] Sidebar session badges update instantly when state changes
- [ ] No new API calls to `/api/projects` when session state changes
- [ ] WebSocket events include all necessary session data (id, state, error_message, metadata, name, updated_at)
- [ ] Type safety maintained with `SessionUpdatedData` interface
- [ ] All existing functionality continues to work (backward compatible)
- [ ] No console errors or warnings in browser
- [ ] Performance improvement measurable (0 API calls vs 1 API call per state change)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Open browser: `http://localhost:5173`
3. Open DevTools → Network tab → Filter by WS (WebSocket)
4. Navigate to a project with sessions
5. Create new session and send a message
6. Verify in Network tab:
   - WebSocket messages: `session.{id}.updated` with `state: 'working'`
   - WebSocket messages: `session.{id}.updated` with `state: 'idle'`
   - NO new XHR/Fetch requests to `/api/projects`
7. Check sidebar:
   - Session shows "Processing" badge immediately when message starts
   - Badge disappears immediately when message completes
   - No delay or flash of old state
8. Test error case:
   - Send invalid message (e.g., nonsense command)
   - Verify error badge appears immediately
   - Check WebSocket message includes `state: 'error'` and `error_message`
9. Check console: No errors or warnings

**Feature-Specific Checks:**

- [ ] Open React DevTools → Components → QueryClientProvider
- [ ] Find query with key `["projects", "with-sessions"]`
- [ ] Verify `dataUpdatedAt` timestamp does NOT change when session state updates (proves no refetch)
- [ ] Verify session data within query DOES update with new state
- [ ] Test with multiple sessions in same project - only active session updates
- [ ] Test with multiple projects - only sessions in active project update

## Implementation Notes

### 1. Query Invalidation as Fallback

Keep the existing `queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() })` call in the `handleMessageComplete` handler as a fallback. This ensures that if WebSocket updates fail or don't fire for any reason, the cache will still be refreshed when the message completes.

### 2. Timestamp Handling

The `updated_at` field should be sent as an ISO string from the backend and converted to a Date object in the frontend. This ensures proper serialization over WebSocket and proper typing in the React Query cache.

### 3. Partial Updates

The `SessionUpdatedData` interface uses all optional fields (except `id`) to support partial updates. This allows sending only the fields that changed, reducing payload size. The frontend merges the partial data with existing session data using the spread operator.

### 4. Cache Immutability

Always create new objects when updating the cache - never mutate existing objects. The implementation uses `map()` to create new arrays and spread operators to create new objects, ensuring React Query detects changes and triggers re-renders.

### 5. Session Not Found Edge Case

If the session or project is not found in the cache when `handleSessionUpdated` runs, the handler returns the unchanged cache. This is safe because the session will appear on the next full refetch (e.g., on page refresh or manual query invalidation).

## Dependencies

- No new dependencies required
- Uses existing WebSocket infrastructure (`@fastify/websocket`)
- Uses existing React Query (`@tanstack/react-query`)
- Uses existing type definitions (`SessionResponse`, `ProjectWithSessions`)

## Timeline

| Task                                | Estimated Time |
| ----------------------------------- | -------------- |
| Backend - Add type definitions      | 15 minutes     |
| Backend - Send WebSocket events     | 30 minutes     |
| Backend - Revert default state      | 5 minutes      |
| Frontend - Handle WebSocket updates | 1 hour         |
| Testing - Manual integration tests  | 1 hour         |
| Testing - Edge cases and cleanup    | 30 minutes     |
| **Total**                           | **3-4 hours**  |

## References

- [React Query - Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [React Query - setQueryData](https://tanstack.com/query/latest/docs/react/reference/QueryClient#queryclientsetquerydata)
- [Fastify WebSocket Plugin](https://github.com/fastify/fastify-websocket)
- Existing implementation: `apps/web/src/server/websocket/handlers/session.handler.ts`
- Existing query keys: `apps/web/src/client/pages/projects/hooks/useProjects.ts`

## Next Steps

1. Review and approve this spec
2. Implement backend changes (Task Groups 1-3)
3. Test backend WebSocket events in browser DevTools
4. Implement frontend changes (Task Group 4)
5. Run manual integration tests
6. Verify no regressions in existing functionality
7. Consider adding E2E tests for state transitions
8. Update spec status to 'completed'
