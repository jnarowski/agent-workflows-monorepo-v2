# Feature: Refactor WebSocket Session System

## What We're Building

A complete refactor of the chat/session system to use centralized state management with a single session store (not a Map), rename all "chat" terminology to "session", implement deferred session creation to prevent empty DB records, and fix WebSocket loop issues with proper connection lifecycle management inspired by react-use-websocket patterns.

## User Story

As a developer working on the agent workflows platform
I want a clean, well-architected session management system
So that I can easily add features, debug issues, and avoid infinite loop bugs while providing users with a reliable real-time chat experience

## Technical Approach

Replace the current fragmented state management (component state + multiple hooks) with a single Zustand store that tracks one `currentSession` (not a Map of sessions). Simplify the WebSocket hook to only handle connection/disconnection, borrowing patterns from react-use-websocket (ReadyState enum, message queue, exponential backoff). Implement deferred session creation where the UUID is generated immediately for navigation, but the DB record is only created when the user sends their first message. Rename all "Chat" references to "Session" for consistency. Fix loop issues by using precise Zustand selectors and stable dependency arrays.

## Files to Touch

### Existing Files

- `apps/web/src/shared/types/chat.ts` - Rename `ChatMessage` interface to `SessionMessage`
- `apps/web/src/client/stores/sessionStore.ts` - Complete rewrite: replace Map with single `currentSession`, add message state management
- `apps/web/src/client/pages/ProjectChat.tsx` - Rename to `ProjectSession.tsx`, simplify using store
- `apps/web/src/client/hooks/useChatWebSocket.ts` - Rename to `useSessionWebSocket.ts`, remove state management, add connection-only logic
- `apps/web/src/client/App.tsx` - Update import from `ProjectChat` to `ProjectSession`
- `apps/web/src/server/websocket.ts` - Add 'connected' message after authentication, uncomment metadata update (lines 386-405)
- All files importing `ChatMessage` - Update to `SessionMessage`
- All files importing `ProjectChat` or `useChatWebSocket` - Update to new names

### New Files

None - this is a refactor of existing files

## Implementation Plan

### Phase 1: Foundation

Rename the `ChatMessage` interface to `SessionMessage` throughout the codebase to establish consistent terminology. Update all imports and type references. This provides a clean foundation before touching the complex state management and WebSocket logic.

### Phase 2: Core Implementation

Rewrite the `sessionStore` to use a single `currentSession` object instead of a Map, incorporating all message state and lifecycle management. Remove state from the WebSocket hook, making it connection-only and borrowing patterns from react-use-websocket (ReadyState enum, message queue, exponential backoff). Implement deferred session creation logic in the store.

### Phase 3: Integration

Update the `ProjectSession` page component to use the simplified store and WebSocket hook. Update the server to send a 'connected' message and uncomment the metadata update logic. Update all component imports and ensure the routing continues to work. Add the "New Session" handler for immediate navigation with deferred creation.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Rename ChatMessage to SessionMessage

- [ ] 1.1 Rename `ChatMessage` interface to `SessionMessage` in types file
  - File: `apps/web/src/shared/types/chat.ts`
  - Update the interface name and export
  - Optional: Consider renaming file to `session.ts` for consistency
- [ ] 1.2 Find all files importing `ChatMessage` and update to `SessionMessage`
  - Use global find/replace: `ChatMessage` → `SessionMessage`
  - Verify all imports updated
- [ ] 1.3 Run type check to ensure no errors
  - Command: `pnpm check-types`
  - Expected: No type errors related to SessionMessage

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 2: Rewrite sessionStore with Single Session

- [ ] 2.1 Back up current sessionStore.ts
  - Command: `cp apps/web/src/client/stores/sessionStore.ts apps/web/src/client/stores/sessionStore.ts.backup`
- [ ] 2.2 Rewrite sessionStore with single session structure
  - File: `apps/web/src/client/stores/sessionStore.ts`
  - Replace `sessions: Map` with `currentSessionId: string | null` and `currentSession: SessionData | null`
  - Add `SessionData` interface with: status, messages, isStreaming, metadata, isFirstMessage, loadingState, error, permissionMode
  - Implement `initializeSession()` - for not-created sessions
  - Implement `createSession()` - POST to API, async
  - Implement `loadSession()` - fetch JSONL, handle 404
  - Implement `clearCurrentSession()` - cleanup on navigation
  - Implement message actions: `addMessage()`, `updateStreamingMessage()`, `finalizeMessage()`, `markFirstMessageSent()`
  - Implement state actions: `setStreaming()`, `updateMetadata()`, `setError()`, `setLoadingState()`
  - Preserve permission mode actions: `setDefaultPermissionMode()`, `setPermissionMode()`, `getPermissionMode()`
  - Remove all sessionId parameters from actions (operate on currentSession)
- [ ] 2.3 Add proper TypeScript types and exports
  - Export: `SessionData`, `SessionStatus`, `LoadingState`, `ClaudePermissionMode`, `SessionStore`
  - Ensure all types are properly defined
- [ ] 2.4 Test store in isolation
  - Create a simple test file or use browser console
  - Verify: `initializeSession()`, `addMessage()`, selectors work

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 3: Rename and Rewrite WebSocket Hook

- [ ] 3.1 Rename hook file
  - Command: `git mv apps/web/src/client/hooks/useChatWebSocket.ts apps/web/src/client/hooks/useSessionWebSocket.ts`
- [ ] 3.2 Rewrite hook as connection-only (no state)
  - File: `apps/web/src/client/hooks/useSessionWebSocket.ts`
  - Add `ReadyState` enum (borrowed from react-use-websocket)
  - Add `getReconnectDelay()` function with exponential backoff
  - Remove all `useState` for messages (use store directly)
  - Add `messageQueueRef` for queuing messages until ready
  - Connect only when `sessionStatus === 'created'`
  - Handle 'connected' message type from server → set `isReady: true`
  - Flush message queue when ready
  - Handle 'stream_output' → call `store.updateStreamingMessage()`
  - Handle 'message_complete' → call `store.finalizeMessage()` and `store.updateMetadata()`
  - Handle 'error' → call `store.addMessage()` and `store.setError()`
  - Implement auto-reconnect with exponential backoff (max 5 attempts)
  - `sendMessage()` queues if not ready, sends if ready
  - Return: `{ readyState, isConnected, isReady, sendMessage, reconnect }`
- [ ] 3.3 Update all imports of `useChatWebSocket` to `useSessionWebSocket`
  - Find and replace across codebase
- [ ] 3.4 Verify hook compiles
  - Command: `pnpm check-types`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 4: Delete useClaudeSession Hook

- [ ] 4.1 Remove useClaudeSession.ts file
  - File: `apps/web/src/client/hooks/useClaudeSession.ts`
  - Command: `git rm apps/web/src/client/hooks/useClaudeSession.ts`
  - Functionality moved to sessionStore and component-level derivation
- [ ] 4.2 Update any imports of useClaudeSession
  - Replace with direct sessionStore usage
  - Check ProjectChat/ProjectSession for usage

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 5: Rename and Rewrite ProjectSession Page

- [ ] 5.1 Rename page component file
  - Command: `git mv apps/web/src/client/pages/ProjectChat.tsx apps/web/src/client/pages/ProjectSession.tsx`
- [ ] 5.2 Rewrite component using simplified store
  - File: `apps/web/src/client/pages/ProjectSession.tsx`
  - Update function name: `ProjectChat` → `ProjectSession`
  - Use simple selectors: `const session = useSessionStore(s => s.currentSession)`
  - Remove all session Map lookups
  - Call `useSessionWebSocket` with sessionId, projectId
  - On mount: call `loadSession()` or `initializeSession()` on 404
  - `handleSubmit()`: Check if `status === 'not-created'`, if so call `createSession()` then `sendMessage()`
  - Handle resume logic: first message gets empty config, subsequent get `{ resume: true, sessionId }`
  - Derive `toolResults` from messages using `useMemo`
  - Block input when: `isCreatingSession || (status === 'created' && !isReady)`
  - Show status banners: disconnected, creating session
- [ ] 5.3 Update all component naming and comments
  - Replace "chat" with "session" in all comments and variables
  - Ensure consistent terminology

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 6: Update App.tsx and Routes

- [ ] 6.1 Update import in App.tsx
  - File: `apps/web/src/client/App.tsx`
  - Change: `import ProjectChat from '@/client/pages/ProjectChat'` → `import ProjectSession from '@/client/pages/ProjectSession'`
  - Update route elements: `<ProjectChat />` → `<ProjectSession />`
- [ ] 6.2 Verify routes still work
  - URLs should remain: `/projects/:id/chat` and `/projects/:id/chat/:sessionId`
  - Only component name changes, not paths

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 7: Add Server 'connected' Message

- [ ] 7.1 Add 'connected' message after WebSocket authentication
  - File: `apps/web/src/server/websocket.ts`
  - Find authentication success (around line 230)
  - After setting `socket.authenticated = true` and `socket.sessionId = sessionId`
  - Send: `socket.send(JSON.stringify({ type: 'connected', sessionId, timestamp: new Date().toISOString() }))`
  - Add log: `console.log('[WebSocket] Client authenticated and ready:', sessionId)`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 8: Uncomment Metadata Update Logic

- [ ] 8.1 Uncomment metadata update in message_complete handler
  - File: `apps/web/src/server/websocket.ts`
  - Lines: 386-405 (currently commented out)
  - Implement proper logic:
    - Parse JSONL session file
    - Calculate metadata (totalTokens, messageCount, lastMessageAt, firstMessagePreview)
    - Update Prisma database
    - Send metadata to client in 'message_complete' message
  - Wrap in try/catch to prevent message failure
  - Log errors but don't throw

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 9: Update Session List "New Session" Handler

- [ ] 9.1 Find the "New Session" button handler
  - Likely in: sidebar component or session list component
  - Look for: button that creates new sessions
- [ ] 9.2 Update handler to use deferred creation pattern
  - Generate UUID: `const newSessionId = uuidv4()`
  - Call: `useSessionStore.getState().initializeSession(newSessionId)`
  - Navigate: `navigate(\`/projects/\${projectId}/chat/\${newSessionId}\`)`
  - No API call yet (deferred until first message)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 10: Final Cleanup and Testing

- [ ] 10.1 Search for any remaining "chat" references that should be "session"
  - Command: `grep -r "Chat" apps/web/src/client --include="*.ts" --include="*.tsx"`
  - Exclude legitimate uses (like ChatInterface component name)
  - Update remaining references
- [ ] 10.2 Remove old backup file
  - Command: `rm apps/web/src/client/stores/sessionStore.ts.backup`
- [ ] 10.3 Run full type check
  - Command: `pnpm check-types`
  - Expected: No type errors
- [ ] 10.4 Run linter
  - Command: `pnpm lint`
  - Expected: No lint errors (fix any that appear)
- [ ] 10.5 Build the application
  - Command: `pnpm build`
  - Expected: Successful build

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Acceptance Criteria

**Must Work:**

- [ ] New session: Click "New Session" → Navigate immediately to `/chat/:sessionId` → URL shows sessionId
- [ ] First message: Type and send → Session created in DB → Message sent with no resume flag
- [ ] Second message: Type and send → Message sent with `resume: true` flag
- [ ] Session switching: Navigate between sessions → Old session cleared → New session loaded
- [ ] Page reload mid-conversation: Reload → Messages load from JSONL → `isFirstMessage: false` set correctly
- [ ] Direct URL access: Type `/projects/abc/chat/new-id` in browser → 404 handled → Session initialized as not-created
- [ ] Message streaming: Messages stream in real-time → Content blocks merge correctly → Finalized when complete
- [ ] Connection lost: WebSocket disconnects → Auto-reconnect with exponential backoff → Success after 1-5 attempts
- [ ] Metadata updates: After message complete → Token count updates in DB → Displayed in UI
- [ ] ToolResults: Tool use/result blocks → Extracted and rendered correctly in ChatInterface
- [ ] Permission modes: Change permission mode → Persists for current session → New sessions use default

**Should Not:**

- [ ] Create empty sessions in database (deferred creation prevents this)
- [ ] Infinite WebSocket reconnection loops (exponential backoff with max 5 attempts)
- [ ] Infinite useEffect loops (precise selectors, stable deps)
- [ ] Messages sent to wrong session (single session store prevents this)
- [ ] Race conditions on rapid message sends (message queue handles this)
- [ ] WebSocket send before 'connected' message (isReady flag prevents this)
- [ ] Break existing terminal/shell functionality (separate WebSocket endpoints)
- [ ] Lose messages on navigation (messages loaded from JSONL on mount)

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

# Start application
cd apps/web && pnpm dev
# Expected: Both client and server start without errors
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Open browser: `http://localhost:5173`
3. Login and navigate to a project
4. Test new session flow:
   - Click "New Session"
   - Verify: URL changes to `/projects/:id/chat/:sessionId` immediately
   - Verify: Input is enabled
   - Send first message
   - Verify: "Creating session..." banner appears briefly
   - Verify: Message sends successfully
   - Verify: Assistant responds
5. Test subsequent messages:
   - Send second message
   - Verify: No "Creating session..." banner
   - Verify: Message sends with resume flag (check network tab)
   - Verify: Assistant responds
6. Test session switching:
   - Click "New Session" again
   - Verify: Old messages cleared
   - Verify: New empty session loaded
   - Send message
   - Verify: Works correctly
7. Test page reload:
   - Reload browser during conversation
   - Verify: Messages reload from server
   - Verify: Send new message works (resume flag used)
8. Test WebSocket reconnection:
   - Open network tab
   - Stop server briefly
   - Verify: "Disconnected" banner appears
   - Restart server
   - Verify: Auto-reconnects
   - Verify: Can send messages again
9. Check console: No errors or infinite loop warnings

**Feature-Specific Checks:**

- Check database: No empty sessions created (no sessions with 0 messages)
- Network tab: Verify 'connected' message received after WebSocket opens
- Network tab: Verify metadata update sent in 'message_complete'
- React DevTools: Check Zustand store → verify `currentSession` structure
- Terminal: Check server logs → no infinite loop warnings
- Test rapid message sending before connection ready → messages queued and sent when ready
- Test with multiple browser tabs → each manages own connection independently
- Test permission mode changes → persists for current session

## Definition of Done

- [ ] All tasks completed
- [ ] Type checks passing (`pnpm check-types`)
- [ ] Lint checks passing (`pnpm lint`)
- [ ] Build successful (`pnpm build`)
- [ ] Manual testing confirms all acceptance criteria met
- [ ] No console errors during normal operation
- [ ] No infinite loops or reconnection issues
- [ ] Code follows existing patterns (Zustand stores, React hooks)
- [ ] All "chat" terminology replaced with "session"
- [ ] SessionMessage used consistently throughout
- [ ] Server sends 'connected' message
- [ ] Metadata updates working without loops

## Notes

**Dependencies:**
- This refactor is self-contained but must not break existing shell/terminal WebSocket functionality
- Database schema remains unchanged (no migrations needed)
- JSONL file format remains unchanged (backward compatible)

**Future Considerations:**
- Could add cross-tab synchronization using BroadcastChannel API if needed
- Could implement message persistence to database (in addition to JSONL) for better querying
- Could add pagination for loading very long session histories
- Permission mode settings could be persisted to localStorage if desired

**Rollback Plan:**
- If issues arise, revert to backup: `git checkout apps/web/src/client/stores/sessionStore.ts.backup`
- Rename components back: `ProjectSession` → `ProjectChat`
- Rename types back: `SessionMessage` → `ChatMessage`
- Keep JSONL files as they are (no data migration needed)

**Key Design Decisions:**
1. Single session per tab (not Map) - Simpler, matches per-tab architecture
2. Deferred creation - Prevents empty DB sessions
3. Connection-ready detection - No setTimeout hacks
4. Borrowed patterns from react-use-websocket - Proven reliability
5. Direct store updates from WebSocket - Eliminates state synchronization issues
