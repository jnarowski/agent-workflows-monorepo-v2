# Feature: App-Wide WebSocket Refactoring

## What We're Building

A unified WebSocket architecture that replaces multiple per-session/per-shell connections with a single global connection. This refactor introduces a custom EventBus for pub/sub event handling, uses flat event naming convention (e.g., `session.{id}.stream_output`), and simplifies the codebase by centralizing WebSocket management in a provider component.

## User Story

As a developer working on the agent workflows platform
I want a single WebSocket connection that handles all real-time events (sessions, shells, global)
So that I can reduce connection overhead, simplify event handling across components, and make it easier to add new real-time features

## Technical Approach

Replace the current per-connection WebSocket architecture with a single global connection managed by a `WebSocketProvider`. Implement a custom `WebSocketEventBus` class for pub/sub pattern. Use flat event naming (`session.{id}.action`, `shell.{id}.action`, `global.action`) to eliminate routing logic in the provider. Refactor existing `useSessionWebSocket` and `useShellWebSocket` hooks to subscribe to events via the EventBus rather than managing their own connections. Update server to handle the unified `/ws` endpoint with message routing based on event type prefixes. Connect provider on app load for immediate availability.

## Files to Touch

### Existing Files

- `apps/web/src/server/websocket.ts` - Complete rewrite for unified `/ws` endpoint with flat event naming
- `apps/web/src/client/hooks/useSessionWebSocket.ts` - Refactor to use EventBus instead of own WebSocket connection
- `apps/web/src/client/hooks/useShellWebSocket.ts` - Refactor to use EventBus instead of own WebSocket connection
- `apps/web/src/client/App.tsx` - Wrap application with WebSocketProvider
- `apps/web/src/client/stores/sessionStore.ts` - Minor updates if needed for new event flow

### New Files

- `apps/web/src/client/lib/WebSocketEventBus.ts` - Custom EventEmitter class for pub/sub
- `apps/web/src/client/providers/WebSocketProvider.tsx` - Global WebSocket connection manager
- `apps/web/src/client/hooks/useWebSocket.ts` - Hook to access WebSocket provider context
- `apps/web/src/shared/types/websocket.ts` - TypeScript types for WebSocket events

## Implementation Plan

### Phase 1: Foundation

Create the core infrastructure: WebSocketEventBus for pub/sub, WebSocketProvider for connection management, and TypeScript types for event safety. This provides the foundation that both client hooks and server will use.

### Phase 2: Server Refactor

Completely rewrite the server WebSocket handler to support the unified `/ws` endpoint with flat event naming. This must be done before client refactoring to ensure the new protocol is ready.

### Phase 3: Client Migration

Refactor client-side hooks (`useSessionWebSocket`, `useShellWebSocket`) to use the EventBus and provider instead of managing their own connections. Wire up the provider in App.tsx.

### Phase 4: Testing & Cleanup

Remove old WebSocket code, verify both session and shell functionality work together, write unit tests, and validate the complete system end-to-end.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Create WebSocket TypeScript Types

- [ ] 1.1 Create shared WebSocket types file
  - File: `apps/web/src/shared/types/websocket.ts`
  - Define event name patterns as TypeScript literals
  - Define message structure: `{ type: string, data: any }`
  - Export `WebSocketMessage`, `WebSocketEventName`, `ReadyState` enum
  - Include session events: `session.*.stream_output`, `session.*.message_complete`, `session.*.error`
  - Include shell events: `shell.*.output`, `shell.*.exit`, `shell.*.initialized`
  - Include global events: `global.connected`, `global.error`

#### Completion Notes

### 2: Create WebSocketEventBus

- [ ] 2.1 Implement EventBus class
  - File: `apps/web/src/client/lib/WebSocketEventBus.ts`
  - Class with Map to store event listeners: `Map<string, Set<Function>>`
  - Method: `on(event: string, handler: Function): void` - Subscribe to event
  - Method: `off(event: string, handler: Function): void` - Unsubscribe from event
  - Method: `emit(event: string, data: any): void` - Emit event to all subscribers
  - Method: `once(event: string, handler: Function): void` - Subscribe once, auto-unsubscribe after first emit
  - NO wildcard pattern matching (keep simple for MVP)
  - Add TypeScript generics for type safety
- [ ] 2.2 Write unit tests for EventBus
  - File: `apps/web/src/client/lib/WebSocketEventBus.test.ts`
  - Test: Subscribe and emit
  - Test: Unsubscribe works correctly
  - Test: `once()` auto-unsubscribes
  - Test: Multiple handlers for same event
  - Test: Emitting to event with no handlers doesn't error

#### Completion Notes

### 3: Create WebSocketProvider

- [ ] 3.1 Create provider component with context
  - File: `apps/web/src/client/providers/WebSocketProvider.tsx`
  - Create `WebSocketContext` with React.createContext
  - Interface: `{ sendMessage: (type: string, data: any) => void, readyState: ReadyState, isConnected: boolean, eventBus: WebSocketEventBus }`
  - Provider manages single WebSocket instance
  - WebSocket URL: `ws://localhost:3000/ws?token=${authToken}` (use authStore to get token)
  - Initialize EventBus instance in provider
- [ ] 3.2 Implement connection lifecycle
  - Connect on provider mount (app load)
  - Track ReadyState: CONNECTING (0), OPEN (1), CLOSING (2), CLOSED (3)
  - `isConnected` derived from `readyState === ReadyState.OPEN`
  - Cleanup on unmount: close WebSocket, clear EventBus listeners
- [ ] 3.3 Implement message queue and ready detection
  - Use `useRef` for message queue: `messageQueueRef.current = []`
  - Track `isReady` state (false until `global.connected` received)
  - Queue messages in `sendMessage()` if not ready
  - On receive `global.connected` event: set `isReady = true`, flush queue
  - After ready, `sendMessage()` sends immediately via `socket.send()`
- [ ] 3.4 Implement message handling
  - `socket.onmessage`: Parse JSON, emit to EventBus
  - Simple: `eventBus.emit(message.type, message.data)`
  - No routing logic - event type is already fully qualified
  - Log errors if JSON parse fails
- [ ] 3.5 Implement exponential backoff reconnection
  - Track `reconnectAttempts` in state (max 5 attempts)
  - Function: `getReconnectDelay(attempt)` returns: 1000, 2000, 4000, 8000, 16000 (ms)
  - On `socket.onclose`: if not intentional, schedule reconnect with backoff
  - On successful reconnect: reset `reconnectAttempts` to 0
  - Expose `reconnect()` method to manually trigger reconnection (resets counter)
- [ ] 3.6 Add error handling
  - `socket.onerror`: Log error, emit `global.error` event
  - Handle auth failures (close code 401)
  - Handle connection refused

#### Completion Notes

### 4: Create useWebSocket Hook

- [ ] 4.1 Create hook to access provider context
  - File: `apps/web/src/client/hooks/useWebSocket.ts`
  - Use `useContext(WebSocketContext)`
  - Throw error if used outside provider
  - Return: `{ sendMessage, readyState, isConnected, eventBus }`
  - Add JSDoc documentation

#### Completion Notes

### 5: Refactor Server WebSocket Handler

- [ ] 5.1 Remove old WebSocket endpoints
  - File: `apps/web/src/server/websocket.ts`
  - Remove: `/ws/chat/:sessionId` endpoint and handler
  - Remove: `/shell` endpoint and handler
  - Remove: `/ws` echo endpoint
  - Keep helper functions if reusable
- [ ] 5.2 Create unified `/ws` endpoint
  - Register new route: `fastify.register(websocketPlugin, { options: { path: '/ws' } })`
  - JWT authentication via query param: `?token=...`
  - Parse and verify token, extract userId
  - Send `global.connected` message after successful auth
  - Log: `[WebSocket] Client connected and authenticated: userId`
- [ ] 5.3 Implement message routing for session events
  - Parse incoming messages: `{ type: string, data: any }`
  - If `type.startsWith('session.')`: route to session handler
  - Extract sessionId from type: `session.{sessionId}.send_message`
  - Verify user owns session (check DB)
  - Create/retrieve AgentClient instance for session
  - Handle actions: `send_message` (existing logic)
  - Send responses with flat event names:
    - `session.{sessionId}.stream_output` with content blocks
    - `session.{sessionId}.message_complete` with metadata
    - `session.{sessionId}.error` on failures
- [ ] 5.4 Implement message routing for shell events
  - If `type.startsWith('shell.')`: route to shell handler
  - Extract shellId from type: `shell.{shellId}.input`
  - Retrieve or create shell process instance
  - Handle actions: `input`, `resize`, `init`
  - Send responses:
    - `shell.{shellId}.output` for terminal output
    - `shell.{shellId}.exit` when process exits
    - `shell.{shellId}.initialized` after init
- [ ] 5.5 Add error handling and logging
  - Wrap handlers in try/catch
  - Send error events: `session.{id}.error` or `shell.{id}.error`
  - Log all incoming/outgoing messages for debugging
  - Handle malformed messages gracefully

#### Completion Notes

### 6: Refactor useSessionWebSocket Hook

- [ ] 6.1 Remove old WebSocket connection logic
  - File: `apps/web/src/client/hooks/useSessionWebSocket.ts`
  - Remove: `useState` for WebSocket instance
  - Remove: `useEffect` that creates WebSocket connection
  - Remove: All `socket.onopen`, `socket.onmessage`, etc. handlers
  - Keep: `messageQueueRef`, reconnection attempt tracking if still needed
- [ ] 6.2 Use WebSocketProvider instead
  - Import: `useWebSocket` hook
  - Get: `{ sendMessage, readyState, isConnected, eventBus }` from provider
  - Remove duplicate ReadyState enum (use shared types)
- [ ] 6.3 Subscribe to session events via EventBus
  - In `useEffect`, subscribe to events for current sessionId:
    - `eventBus.on(\`session.\${sessionId}.stream_output\`, handleStreamOutput)`
    - `eventBus.on(\`session.\${sessionId}.message_complete\`, handleMessageComplete)`
    - `eventBus.on(\`session.\${sessionId}.error\`, handleError)`
  - Cleanup: `eventBus.off(...)` in useEffect return
  - Dependencies: `[sessionId, eventBus]`
- [ ] 6.4 Update sendMessage implementation
  - Format message with flat event name: `sendMessage(\`session.\${sessionId}.send_message\`, messageData)`
  - Keep same external interface for backward compatibility
  - No need for internal message queue (provider handles it)
- [ ] 6.5 Update event handlers
  - `handleStreamOutput`: Call `sessionStore.updateStreamingMessage(data)`
  - `handleMessageComplete`: Call `sessionStore.finalizeMessage()` and `sessionStore.updateMetadata(data.metadata)`
  - `handleError`: Call `sessionStore.addMessage(errorMessage)` and `sessionStore.setError(data.error)`
  - Keep existing logic, just triggered by EventBus now

#### Completion Notes

### 7: Refactor useShellWebSocket Hook

- [ ] 7.1 Remove old WebSocket connection logic
  - File: `apps/web/src/client/hooks/useShellWebSocket.ts`
  - Remove: WebSocket instance creation
  - Remove: Direct socket event handlers
- [ ] 7.2 Use WebSocketProvider instead
  - Import and use: `useWebSocket` hook
  - Get: `{ sendMessage, readyState, isConnected, eventBus }`
- [ ] 7.3 Subscribe to shell events via EventBus
  - Subscribe to events for current shellId:
    - `eventBus.on(\`shell.\${shellId}.output\`, handleOutput)`
    - `eventBus.on(\`shell.\${shellId}.exit\`, handleExit)`
    - `eventBus.on(\`shell.\${shellId}.initialized\`, handleInitialized)`
  - Cleanup on unmount
- [ ] 7.4 Update sendMessage for shell actions
  - Send input: `sendMessage(\`shell.\${shellId}.input\`, inputData)`
  - Send resize: `sendMessage(\`shell.\${shellId}.resize\`, { rows, cols })`
  - Send init: `sendMessage(\`shell.\${shellId}.init\`, initData)`

#### Completion Notes

### 8: Integrate WebSocketProvider in App

- [ ] 8.1 Wrap app with WebSocketProvider
  - File: `apps/web/src/client/App.tsx`
  - Import: `WebSocketProvider`
  - Wrap root component (inside Router, outside Routes):
    ```tsx
    <Router>
      <WebSocketProvider>
        <Routes>...</Routes>
      </WebSocketProvider>
    </Router>
    ```
  - Provider will connect on app load automatically
- [ ] 8.2 Verify auth token is available
  - WebSocketProvider needs `authStore.token`
  - Ensure token is loaded before provider tries to connect
  - Add check: if no token, don't connect (user not logged in)

#### Completion Notes

### 9: Testing & Validation

- [ ] 9.1 Test session functionality end-to-end
  - Start app, login, navigate to project
  - Create new session, send message
  - Verify: Message streams correctly
  - Verify: Message completes with metadata
  - Send second message, verify resume works
- [ ] 9.2 Test shell functionality end-to-end
  - Open terminal in app
  - Type commands, verify output streams
  - Verify: Resize events work
  - Verify: Process exit detected
- [ ] 9.3 Test both session + shell simultaneously
  - Open session in one tab/pane
  - Open terminal in another
  - Verify: Both work without interference
  - Verify: Single WebSocket connection in network tab
- [ ] 9.4 Test reconnection logic
  - Stop server while connected
  - Verify: Reconnection attempts with backoff
  - Restart server
  - Verify: Auto-reconnects successfully
  - Verify: Can send messages after reconnect
- [ ] 9.5 Test error scenarios
  - Invalid auth token
  - Malformed message
  - Session user doesn't own
  - Verify: Appropriate error events emitted

#### Completion Notes

### 10: Cleanup & Documentation

- [ ] 10.1 Remove dead code
  - Search for any orphaned WebSocket connection code
  - Remove old connection logic from hooks
  - Remove unused imports
- [ ] 10.2 Run type check
  - Command: `pnpm check-types`
  - Expected: No type errors
- [ ] 10.3 Run linter
  - Command: `pnpm lint`
  - Expected: No lint errors (fix any that appear)
- [ ] 10.4 Build verification
  - Command: `pnpm build`
  - Expected: Successful build

#### Completion Notes

## Acceptance Criteria

**Must Work:**

- [ ] Single WebSocket connection visible in browser DevTools network tab
- [ ] Session messaging: create session, send message, receive streaming response
- [ ] Session messaging: metadata updates after message complete
- [ ] Shell terminal: input/output streaming works correctly
- [ ] Shell terminal: resize events handled
- [ ] Multiple sessions in different browser tabs work independently
- [ ] Session + shell can be used simultaneously without conflicts
- [ ] WebSocket reconnects automatically after disconnect (exponential backoff)
- [ ] Manual reconnect resets attempt counter
- [ ] Messages queued while connecting are sent when ready
- [ ] Error events emitted and handled gracefully
- [ ] No memory leaks from EventBus subscriptions (cleanup works)

**Should Not:**

- [ ] Create multiple WebSocket connections (only one global connection)
- [ ] Break existing session or shell functionality
- [ ] Send messages before `global.connected` received
- [ ] Infinite reconnection loops (max 5 attempts enforced)
- [ ] Lose messages during reconnection
- [ ] Allow unauthorized access to sessions/shells
- [ ] Crash on malformed messages
- [ ] Interfere with other WebSocket libraries or features

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web && pnpm check-types
# Expected: No type errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors

# Build verification
cd apps/web && pnpm build
# Expected: Build completes successfully

# Unit tests
cd apps/web && pnpm test WebSocketEventBus
# Expected: All EventBus tests pass

# Start application
cd apps/web && pnpm dev
# Expected: Both client and server start without errors
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Open browser: `http://localhost:5173`
3. Open DevTools → Network → WS tab
4. Login and navigate to a project
5. Verify: Only ONE WebSocket connection appears
6. Test session messaging:
   - Click "New Session"
   - Send a message
   - Verify: Message streams in real-time
   - Verify: Message completes with metadata
   - Send second message
   - Verify: Resume works correctly
7. Test shell functionality:
   - Open terminal (if available in UI)
   - Type `ls -la` and press Enter
   - Verify: Output appears in terminal
   - Verify: Can continue typing commands
8. Test reconnection:
   - Stop server (`Ctrl+C` in terminal)
   - Verify: "Disconnected" status appears in UI
   - Restart server (`pnpm dev`)
   - Verify: Auto-reconnects within 1-2 seconds
   - Verify: Can send messages again
9. Test multiple tabs:
   - Open app in two browser tabs
   - Navigate to different sessions in each
   - Verify: Each tab has own WebSocket connection
   - Verify: Sessions don't interfere with each other
10. Check console: No errors or warnings

**Feature-Specific Checks:**

- Network tab shows single `/ws` WebSocket connection (not `/ws/chat/:id` or `/shell`)
- WebSocket frames show flat event names: `session.{id}.stream_output`, `shell.{id}.output`, `global.connected`
- EventBus has no memory leaks: open session, close, open new → verify old handlers cleaned up
- Message queue works: send message before connected → message sent after `global.connected`
- Exponential backoff visible in console logs: 1s, 2s, 4s delays between reconnect attempts
- Server logs show unified `/ws` endpoint handling both session and shell messages

## Definition of Done

- [ ] All tasks completed (steps 1-10)
- [ ] EventBus unit tests written and passing
- [ ] Type checks passing (`pnpm check-types`)
- [ ] Lint checks passing (`pnpm lint`)
- [ ] Build successful (`pnpm build`)
- [ ] Manual testing confirms all acceptance criteria met
- [ ] No console errors during normal operation
- [ ] Single WebSocket connection confirmed in DevTools
- [ ] Both session and shell functionality verified working
- [ ] Reconnection logic tested and working
- [ ] Code follows existing patterns (React hooks, Zustand stores)
- [ ] No memory leaks from EventBus subscriptions
- [ ] Old WebSocket code removed

## Notes

**Dependencies:**
- This refactor touches core real-time communication infrastructure
- Both session (chat) and shell (terminal) features depend on WebSocket
- Must maintain backward compatibility with existing session and shell behavior
- Database schema and JSONL formats remain unchanged

**Future Considerations:**
- Could add wildcard pattern matching to EventBus (`session.*.stream_output`) for advanced use cases
- Could add connection pooling if scaling to many concurrent users
- Could implement message persistence/replay for offline support
- Could add metrics/monitoring for WebSocket health
- Could add compression for large messages

**Rollback Plan:**
- If critical issues arise, revert commits for this feature
- Old endpoint structure commented out in server, can be restored
- Client hooks retain same external interface, so components don't break
- JSONL and database data unaffected, no data migration needed

**Key Design Decisions:**
1. Single global connection - Reduces overhead, simpler state management
2. Flat event naming - Eliminates routing logic, more flexible
3. Custom EventBus - Lightweight, no dependencies, exact fit for needs
4. Connect on app load - Better UX, connection ready immediately
5. No wildcard patterns initially - Keep simple, add later if needed
6. Provider pattern - Follows React best practices, easy to test
7. Clean cutover deployment - Users refresh browser, simpler than migration
