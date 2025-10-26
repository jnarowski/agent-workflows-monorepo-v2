# Feature: Clean Up Form Params and Session Store

## What We're Building

Simplify the session store by establishing a single source of truth for permission mode (`form.permissionMode`), rename verbose fields for clarity (`currentSession` → `session`), and revert to a simple query parameter approach instead of encoded config objects. This eliminates sync bugs and makes the codebase more maintainable.

## User Story

As a developer maintaining the session store
I want a single, clear source of truth for permission mode and cleaner naming
So that I can avoid sync bugs, reduce complexity, and make the code easier to understand

## Technical Approach

Remove redundant permission mode storage from `SessionData` and keep only `form.permissionMode` as the single source. Rename verbose fields (`currentSession`, `promptForm`, etc.) to cleaner alternatives (`session`, `form`). Revert from encoded config parameters back to simple `?query=...` URL parameters. Simplify `ChatPromptInput` by removing local state and complex syncing logic, reading directly from the store instead.

## Files to Touch

### Existing Files

- `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` - Remove permission mode from SessionData, rename fields, simplify methods
- `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` - Remove local state, simplify to read from store
- `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx` - Update naming, revert to simple query param, fix WebSocket calls
- `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts` - Update test assertions for new naming
- `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Update references to renamed fields

### New Files

None (we're deleting a file)

### Files to Delete

- `apps/web/src/client/pages/projects/sessions/utils/sessionConfig.ts` - No longer needed with simple query param

## Implementation Plan

### Phase 1: Foundation

Update type definitions in sessionStore.ts to remove redundant permission mode and rename fields. This establishes the new structure before updating implementations.

### Phase 2: Core Implementation

Update sessionStore implementation to use new names and simplified permission mode logic. Update ChatPromptInput to remove local state and read directly from store. Update ProjectSession to use new names and revert to simple query params.

### Phase 3: Integration

Delete obsolete files, update tests, verify all references are updated, and ensure WebSocket calls use the correct permission mode source.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Update sessionStore Types and Interfaces

<!-- prettier-ignore -->
- [ ] 1.1 Rename `PromptFormState` to `FormState`
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Change interface name at line 30
- [ ] 1.2 Remove `permissionMode` from `SessionData` interface
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Remove line 46: `permissionMode: ClaudePermissionMode;`
- [ ] 1.3 Rename fields in `SessionStore` interface
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Line 56: `currentSessionId` → `sessionId`
        - Line 57: `currentSession` → `session`
        - Line 58: Remove `defaultPermissionMode`
        - Line 59: `promptForm` → `form`
- [ ] 1.4 Update method names in `SessionStore` interface
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Line 63: `clearCurrentSession` → `clearSession`
        - Line 77-79: Remove `setDefaultPermissionMode`, `setPermissionMode`, `getPermissionMode`
        - Line 82: `setPromptFormPermissionMode` → `setPermissionMode`
        - Line 83: `getPromptFormPermissionMode` → `getPermissionMode`

#### Completion Notes

### 2: Update sessionStore Implementation

<!-- prettier-ignore -->
- [ ] 2.1 Update initial state
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Line 91: `currentSessionId` → `sessionId`
        - Line 92: `currentSession` → `session`
        - Line 93: Remove `defaultPermissionMode`
        - Line 94: `promptForm` → `form`
- [ ] 2.2 Update `loadSession` method
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Line 116-128: Update all `currentSessionId` → `sessionId`, `currentSession` → `session`
        - Line 126: Remove `permissionMode: get().defaultPermissionMode,` from session initialization
        - Update all remaining references in the method
- [ ] 2.3 Update `clearCurrentSession` to `clearSession`
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Line 186: Rename function
        - Line 188-189: `currentSessionId` → `sessionId`, `currentSession` → `session`
- [ ] 2.4 Update all action methods
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Update all `state.currentSession` → `state.session` throughout the file
        - Lines 194-353: Update every action method
- [ ] 2.5 Remove session-level permission mode methods
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Remove `setDefaultPermissionMode` (line 357)
        - Remove `setPermissionMode` (line 362)
        - Remove `getPermissionMode` (line 371)
- [ ] 2.6 Rename form permission mode methods
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Line 377: `setPromptFormPermissionMode` → `setPermissionMode`
        - Line 379: `promptForm` → `form`
        - Line 387: `getPromptFormPermissionMode` → `getPermissionMode`
        - Line 389: `promptForm` → `form`

#### Completion Notes

### 3: Simplify ChatPromptInput

<!-- prettier-ignore -->
- [ ] 3.1 Remove local permission mode state
        - File: `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
        - Remove lines 111-118: Local `useState` initialization
- [ ] 3.2 Remove complex syncing useEffect
        - File: `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
        - Remove lines 120-128: useEffect that syncs permission mode
- [ ] 3.3 Update store selectors
        - File: `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
        - Line 99-108: Remove old selectors
        - Add: `const permissionMode = useSessionStore((s) => s.form.permissionMode);`
        - Add: `const setPermissionMode = useSessionStore((s) => s.setPermissionMode);`
- [ ] 3.4 Simplify handlePermissionModeChange
        - File: `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
        - Lines 131-140: Replace entire function with just `setPermissionMode(mode)`

#### Completion Notes

### 4: Update ProjectSession

<!-- prettier-ignore -->
- [ ] 4.1 Update store selectors
        - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
        - Line 29: `currentSession` → `session`
        - Line 30: `currentSessionId` → `sessionId`
        - Line 32: `clearCurrentSession` → `clearSession`
- [ ] 4.2 Remove sessionConfig imports and add simple query handling
        - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
        - Remove line 14: `import { encodeSessionConfig, decodeSessionConfig } from "./utils/sessionConfig";`
- [ ] 4.3 Update session loading useEffect
        - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
        - Lines 58-59: `clearCurrentSession` → `clearSession`
        - Lines 63-91: Replace config param logic with simple query param:
          ```typescript
          const queryParam = searchParams.get('query');
          if (queryParam) {
            // Initialize session without config
            // Remove permissionMode from initialization
          }
          ```
        - Update all `currentSessionId` → `sessionId`, `currentSession` → `session`
- [ ] 4.4 Update initial message useEffect
        - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
        - Lines 138-174: Replace config decoding with simple query param:
          ```typescript
          const queryParam = searchParams.get('query');
          if (queryParam) {
            const decodedMessage = decodeURIComponent(queryParam);
            // Use decodedMessage
          }
          ```
- [ ] 4.5 Update handleSubmit for new sessions
        - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
        - Lines 210-233: Update to use simple query param:
          - Line 211-212: Update to use `getPermissionMode()` (renamed method)
          - Lines 222-227: Replace config encoding with simple query param:
            ```typescript
            navigate(`/projects/${projectId}/session/${newSession.id}?query=${encodeURIComponent(message)}`);
            ```
- [ ] 4.6 Update handleSubmit for existing sessions
        - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
        - Line 260-261: Update to use `getPermissionMode()` (renamed method)
        - Update all `session` references (was `currentSession`)

#### Completion Notes

### 5: Update Tests and Delete Obsolete Files

<!-- prettier-ignore -->
- [ ] 5.1 Update sessionStore.test.ts
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts`
        - Update all `currentSession` → `session`
        - Update all `currentSessionId` → `sessionId`
        - Update all `promptForm` → `form`
        - Remove tests for deleted permission mode methods
- [ ] 5.2 Delete sessionConfig.ts
        - File: `apps/web/src/client/pages/projects/sessions/utils/sessionConfig.ts`
        - Delete this entire file
- [ ] 5.3 Update useSessionWebSocket if needed
        - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
        - Check for any references to `currentSession` or `promptForm` and update

#### Completion Notes

### 6: Verification and Testing

<!-- prettier-ignore -->
- [ ] 6.1 Run type checking
        - Command: `pnpm --filter web check-types`
        - Expected: No type errors
- [ ] 6.2 Run linting
        - Command: `pnpm --filter web lint`
        - Expected: No lint errors
- [ ] 6.3 Run unit tests
        - Command: `pnpm --filter web test`
        - Expected: All tests pass
- [ ] 6.4 Manual testing: Create new session with plan mode
        - Start app, go to /session/new
        - Select "Plan Mode"
        - Type message and submit
        - Verify: Session created, message sent, plan mode persists
- [ ] 6.5 Manual testing: Change mode in existing session
        - Open existing session
        - Change permission mode
        - Send message
        - Verify: Message uses correct mode
- [ ] 6.6 Manual testing: Return to /session/new
        - Navigate to /session/new
        - Verify: Permission mode shows last selected value

#### Completion Notes

## Acceptance Criteria

**Must Work:**

- [ ] Single source of truth: `form.permissionMode` for all permission mode operations
- [ ] Cleaner naming: `session`, `sessionId`, `form` instead of verbose names
- [ ] Simple URL params: `?query=...` instead of encoded config
- [ ] Permission mode persists across session creation
- [ ] ChatPromptInput reads directly from store, no local state syncing
- [ ] WebSocket messages include correct permission mode from `form.permissionMode`
- [ ] No type errors or lint errors
- [ ] All existing tests pass (after updates)

**Should Not:**

- [ ] Break existing session loading functionality
- [ ] Lose permission mode on navigation
- [ ] Have sync issues between different permission mode sources (there's only one now)
- [ ] Have console errors or warnings
- [ ] Break WebSocket message sending

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

    # Type checking
    pnpm --filter web check-types
    # Expected: No type errors

    # Linting
    pnpm --filter web lint
    # Expected: No lint errors

    # Unit tests
    pnpm --filter web test
    # Expected: All tests pass

**Manual Verification:**

1. Start application: `pnpm --filter web dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}/session/new`
3. Select "Plan Mode" in permission selector
4. Type a message and submit
5. Verify: URL changes to `/session/{newSessionId}?query=...` (no config param)
6. Verify: Message appears in chat
7. Verify: Agent responds in plan mode
8. Navigate back to `/session/new`
9. Verify: Permission selector still shows "Plan Mode"
10. Change to "Accept Edits" mode
11. Create another session
12. Verify: New session uses "Accept Edits" mode
13. Open an existing session
14. Change permission mode to "Reject"
15. Send a message
16. Verify: Message sent with "Reject" mode
17. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify no references to `currentSession` remain (grep for it)
- Verify no references to `promptForm` remain (grep for it)
- Verify sessionConfig.ts is deleted
- Verify URL uses simple `?query=...` param, not `?config=...`
- Verify `form.permissionMode` is the only permission mode source
- Check WebSocket messages in browser DevTools include correct `permissionMode`

## Definition of Done

- [ ] All tasks completed in order
- [ ] Tests passing (after updates)
- [ ] No type errors
- [ ] No lint errors
- [ ] Manual testing confirms permission mode persistence works
- [ ] No console errors
- [ ] Code follows existing patterns
- [ ] All references to old names updated
- [ ] sessionConfig.ts deleted
- [ ] Simple query param approach working

## Notes

**Key Simplifications:**
1. Single source of truth eliminates sync bugs
2. Cleaner naming makes code more readable
3. Simple query param is easier to debug than encoded config
4. Removing local state from ChatPromptInput reduces complexity

**Future Considerations:**
- Could add more fields to `FormState` for other global preferences (model, temperature, etc.)
- Consider persisting `form` to localStorage for cross-session persistence
- May want to add form validation for permission mode values

**Dependencies:**
- No external dependencies
- Pure refactoring, no new features or behavior changes
