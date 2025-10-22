# Feature: Session Naming

## What We're Building

AI-generated session names that automatically provide descriptive titles for chat sessions based on the user's initial message. Sessions get named once (either immediately after the first message or when loading from history) and the frontend is notified via WebSocket when names are ready.

## User Story

As a user
I want my chat sessions to have descriptive, AI-generated names
So that I can easily identify and navigate between different conversations in my session history

## Technical Approach

Use the existing `generateSessionName` utility (powered by Claude 3.5 Sonnet) to create 3-5 word descriptive names from the first user message. Name generation happens in two scenarios: (1) immediately after a new session's first message completes, using the prompt already in memory, or (2) during session sync for historical sessions without names, reading from JSONL files. A generic `session_updated` WebSocket event notifies the frontend of changes, making the system extensible for future session updates.

## Files to Touch

### Existing Files

- `prisma/schema.prisma` - Already updated with `name` field (nullable String)
- `src/shared/types/agent-session.types.ts` - Add `name` field to `SessionResponse` interface
- `src/server/services/agent-session.service.ts` - Add `generateAndUpdateSessionName` method and update response mappings
- `src/server/websocket.ts` - Integrate name generation after first message and send `session_updated` event
- `.env.example` - Already documents `ANTHROPIC_API_KEY`

### New Files

None - leveraging existing `src/server/utils/generateSessionName.ts`

## Implementation Plan

### Phase 1: Foundation

Update type definitions to include the `name` field in session responses and define the new `GenerateSessionNameOptions` interface for the service method.

### Phase 2: Core Implementation

Implement the `generateAndUpdateSessionName` method in AgentSessionService with smart prompt handling (accepts in-memory prompt or reads from JSONL), authorization checks, and idempotent behavior (skips if name already exists).

### Phase 3: Integration

Integrate name generation into the WebSocket flow for new sessions and the sync flow for historical sessions. Add `session_updated` WebSocket event to notify frontend of changes.

## Step by Step Tasks

### 1: Update Type Definitions

<!-- prettier-ignore -->
- [ ] 1.1 Add `name` field to `SessionResponse` interface
        - File: `src/shared/types/agent-session.types.ts`
        - Add `name: string | null;` after `userId` field with comment "AI-generated session name"

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 2: Implement generateAndUpdateSessionName Method

<!-- prettier-ignore -->
- [ ] 2.1 Add `GenerateSessionNameOptions` interface to agent-session.service.ts
        - File: `src/server/services/agent-session.service.ts`
        - Define interface with `sessionId: string`, `userId: string`, `userPrompt?: string`
- [ ] 2.2 Import `generateSessionName` utility
        - File: `src/server/services/agent-session.service.ts`
        - Add: `import { generateSessionName } from '../utils/generateSessionName';`
- [ ] 2.3 Implement `generateAndUpdateSessionName` method
        - File: `src/server/services/agent-session.service.ts`
        - Check if session exists and user is authorized
        - Return early if session already has a name (idempotent)
        - Use provided `userPrompt` if available, otherwise read from JSONL via `getSessionMessages`
        - Extract text from content (handle both string and array formats)
        - Call `generateSessionName({ userPrompt })`
        - Update session with generated name
        - Add comprehensive logging for debugging
        - Catch and log errors without throwing (background operation)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 3: Update Service Response Mappings

<!-- prettier-ignore -->
- [ ] 3.1 Add `name` field to `getSessionsByProject` response mapping
        - File: `src/server/services/agent-session.service.ts` (line ~256)
        - Add `name: session.name,` to returned object
- [ ] 3.2 Add `name` field to `createSession` response
        - File: `src/server/services/agent-session.service.ts` (line ~341)
        - Add `name: session.name,` to returned object
- [ ] 3.3 Add `name` field to `updateSessionMetadata` response
        - File: `src/server/services/agent-session.service.ts` (line ~383)
        - Add `name: updatedSession.name,` to returned object

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 4: Integrate Name Generation in WebSocket Flow

<!-- prettier-ignore -->
- [ ] 4.1 Generate name after first message completes
        - File: `src/server/websocket.ts` (after line ~384, in message_complete handler)
        - After metadata update, check if `session.name` is null
        - If null, call `agentSessionService.generateAndUpdateSessionName({ sessionId, userId, userPrompt: data.message })` asynchronously
        - Don't await - let it run in background
- [ ] 4.2 Send `session_updated` WebSocket event after name generation
        - File: `src/server/websocket.ts` (in generateAndUpdateSessionName callback)
        - Modify method to return the generated name
        - Send WebSocket event: `{ type: "session_updated", sessionId, updates: { name }, timestamp }`
        - Handle errors gracefully (name generation is non-critical)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 5: Integrate Name Generation in Session Sync Flow

<!-- prettier-ignore -->
- [ ] 5.1 Generate names for synced sessions without names
        - File: `src/server/services/agent-session.service.ts` (in `syncProjectSessions`, after line ~199)
        - After creating/updating each session, check if `session.name` is null
        - If null, call `generateAndUpdateSessionName({ sessionId, userId })` in background (no userPrompt)
        - Don't await - allow parallel generation
        - Note: No WebSocket notification needed (user not connected)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Acceptance Criteria

**Must Work:**

- [ ] New sessions get AI-generated names after first message
- [ ] Names are 3-5 words, descriptive, in Title Case
- [ ] Frontend receives `session_updated` event when name is ready
- [ ] Synced historical sessions without names get names generated in background
- [ ] Name generation only runs once per session (idempotent)
- [ ] Falls back to "Untitled Session" if API key missing or generation fails
- [ ] Works with both string and array content formats

**Should Not:**

- [ ] Block message sending/receiving (runs async)
- [ ] Regenerate names for sessions that already have them
- [ ] Crash if ANTHROPIC_API_KEY is not set
- [ ] Break existing session functionality
- [ ] Expose sensitive information in session names

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Build verification
pnpm build
# Expected: Successful build with no errors

# Unit tests for generateSessionName (already exists)
pnpm test src/server/utils/generateSessionName.test.ts
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Ensure `ANTHROPIC_API_KEY` is set in `.env`
3. Create new chat session and send first message
4. Verify: Session name appears in WebSocket `session_updated` event within a few seconds
5. Check database: `sqlite3 prisma/dev.db "SELECT id, name FROM agent_sessions LIMIT 5;"`
6. Verify: Names are present and descriptive
7. Test sync: Delete session name in DB, run sync endpoint
8. Verify: Name regenerates from JSONL file

**Feature-Specific Checks:**

- Test with missing API key: Should fall back to "Untitled Session"
- Test with empty message: Should handle gracefully
- Test with image-only message: Should handle gracefully
- Verify names don't include quotes or punctuation
- Check console logs for "Generated name for session {id}: {name}"
- Confirm WebSocket event structure matches: `{ type: "session_updated", sessionId, updates: { name }, timestamp }`

## Definition of Done

- [ ] All tasks completed
- [ ] Type checks pass
- [ ] Build succeeds
- [ ] Manual testing confirms names appear
- [ ] WebSocket events received on frontend
- [ ] No console errors during name generation
- [ ] Graceful fallback when API key missing
- [ ] Code follows existing patterns (object args, error handling)

## Notes

- Name generation uses Claude 3.5 Sonnet (configured in `generateSessionName.ts`)
- Costs ~200 tokens per name generation (prompt is truncated to 200 chars)
- Future enhancement: Allow users to edit/customize generated names
- Future enhancement: Add `session_updated` event for metadata changes too
- The `session_updated` event is extensible for future session changes beyond just name
