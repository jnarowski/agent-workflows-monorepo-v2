# Feature: Agent CLI SDK Complete Refactor

## What We're Building

A complete architectural simplification of the agent-cli-sdk package, removing session management abstractions, eliminating inheritance patterns, and restructuring to a flat, lightweight adapter-based design. This refactor reduces complexity by ~60% while maintaining full functionality and preparing the codebase for easy addition of Cursor and Gemini adapters.

## User Story

As a developer using the agent-cli-sdk
I want a simple, predictable API with lightweight adapter classes
So that I can execute AI CLI commands without navigating complex abstractions and easily add new AI tools

## Technical Approach

Replace the current multi-layer architecture (AgentClient → BaseAdapter → Adapter → Session) with lightweight adapter classes that directly manage CLI execution. Move shared utilities to a `shared/` directory, consolidate types into a flat hierarchy, preserve all existing event types for type safety, and delete unused code (session management, factory functions, async utilities). The refactor maintains test coverage throughout to ensure no regressions.

## Files to Touch

### Existing Files to Delete

**Core Architecture (to be replaced):**
- `src/client/agent-client.ts` - AgentClient wrapper class
- `src/client/session.ts` - Unified Session wrapper
- `src/core/base-adapter.ts` - BaseAdapter inheritance
- `src/core/interfaces.ts` - Old interface definitions
- `src/factories/index.ts` - Factory functions
- `src/adapters/claude/session.ts` - ClaudeSession class
- `src/adapters/claude/index.ts` - Old ClaudeAdapter
- `src/adapters/codex/index.ts` - Old CodexAdapter

**Type System (to be restructured):**
- `src/types/session.ts` - Session types
- `src/types/config.ts` - Config types
- `src/types/logging.ts` - Will merge into shared
- `src/types/events/base.ts` - Generic base type
- `src/types/events/index.ts` - Re-export file
- `src/types/index.ts` - Old type exports
- `src/types/interfaces.ts` - Old interfaces

**Utilities (to be moved/deleted/simplified):**
- `src/utils/async.ts` - Unused utilities (DELETE)
- `src/utils/index.ts` - Re-export file (DELETE)
- `src/utils/validation.ts` - Unused validation functions (DELETE)
- `src/utils/spawn.ts` - Move to shared/ (keep as-is)
- `src/utils/logger.ts` - Simplify and move to shared/logging.ts
- `src/utils/json-parser.ts` - Move to shared/ (keep as-is)

**Examples (obsolete):**
- `examples/sessions/` - Entire directory
- `examples/advanced/` - Entire directory
- `examples/README.md` - Will recreate

**Tests (to be replaced):**
- `tests/unit/client/` - Entire directory
- `tests/integration/` - Entire directory
- `tests/unit/adapters/` - Will recreate as tests/unit/claude/ and tests/unit/codex/

### New Files to Create

**Claude Adapter:**
- `src/claude/index.ts` - New lightweight ClaudeAdapter class
- `src/claude/types.ts` - ClaudeOptions, ClaudeConfig types
- `src/claude/events.ts` - Move from src/types/events/claude.ts
- `src/claude/cli-args.ts` - Extract buildClaudeArgs from cli-wrapper.ts

**Codex Adapter:**
- `src/codex/index.ts` - New lightweight CodexAdapter class
- `src/codex/types.ts` - CodexOptions, CodexConfig types
- `src/codex/events.ts` - Move from src/types/events/codex.ts
- `src/codex/cli-args.ts` - Extract buildCodexArgs from cli-wrapper.ts

**Cursor & Gemini Stubs:**
- `src/cursor/index.ts` - Stub adapter (throws not implemented)
- `src/gemini/index.ts` - Stub adapter (throws not implemented)

**Shared Utilities:**
- `src/shared/types.ts` - Base ExecutionOptions, ExecutionResponse, etc.
- `src/shared/spawn.ts` - Moved from utils/ (keep as-is)
- `src/shared/logging.ts` - Simplified version of utils/logger.ts
- `src/shared/json-parser.ts` - Moved from utils/ (keep as-is)
- `src/shared/errors.ts` - Moved from core/errors.ts (keep as-is)

**Examples:**
- `examples/basic/claude.ts` - Update to new API
- `examples/basic/codex.ts` - Update to new API
- `examples/session-continuation.ts` - New example showing sessionId pattern
- `examples/streaming.ts` - New example showing onOutput callbacks
- `examples/multi-agent.ts` - New example showing getAdapter()
- `examples/structured-output.ts` - Update existing example

**Tests:**
- `tests/unit/claude/adapter.test.ts` - New ClaudeAdapter tests
- `tests/unit/codex/adapter.test.ts` - New CodexAdapter tests
- `tests/unit/claude/parser.test.ts` - Move from old location
- `tests/unit/codex/parser.test.ts` - Move from old location
- `tests/unit/shared/spawn.test.ts` - Move from old utils/ tests
- `tests/unit/shared/json-parser.test.ts` - Move from old utils/ tests

**Documentation:**
- `README.md` - Complete rewrite with new API
- `CHANGELOG.md` - Add 4.0.0 breaking changes section

### Existing Files to Modify

**Adapters (move and refactor):**
- `src/adapters/claude/cli-detector.ts` → `src/claude/cli-detector.ts`
- `src/adapters/claude/cli-wrapper.ts` → Extract to `src/claude/cli-args.ts`
- `src/adapters/claude/parser.ts` → `src/claude/parser.ts` (rename parseStreamOutput → parseClaudeOutput)
- `src/adapters/claude/image-handler.ts` → `src/claude/image-handler.ts`
- `src/adapters/claude/mcp-detector.ts` → `src/claude/mcp-detector.ts`
- `src/adapters/codex/cli-detector.ts` → `src/codex/cli-detector.ts`
- `src/adapters/codex/cli-wrapper.ts` → Extract to `src/codex/cli-args.ts`
- `src/adapters/codex/parser.ts` → `src/codex/parser.ts`

**Core:**
- `src/core/errors.ts` → `src/shared/errors.ts` (move, keep as-is)

**Main:**
- `src/index.ts` - Complete rewrite of exports

**Tests:**
- `tests/e2e/claude-e2e.test.ts` - Update to use new ClaudeAdapter
- `tests/e2e/codex-e2e.test.ts` - Update to use new CodexAdapter

**Web App Integration:**
- `apps/web/src/server/websocket.ts` - Update to use ClaudeAdapter directly

**Config:**
- `package.json` - Update version to 4.0.0

## Implementation Plan

### Phase 1: Foundation (Setup & Shared Utilities)

Create the new shared utilities directory with base types and helper functions. This establishes the foundation that all adapters will depend on. Move spawn and json-parser as-is to minimize risk. Simplify logging by removing verbose console output and unused helper functions. Delete validation.ts entirely (prompt validation will be inlined in adapters - only 4 lines). Create the base type system (ExecutionOptions, ExecutionResponse) that will be extended by adapter-specific types.

### Phase 2: Claude Adapter (Reference Implementation)

Build the new lightweight ClaudeAdapter as the reference implementation. Extract and reorganize Claude-specific code from the old nested adapter structure into a flat directory. Create the ClaudeAdapter class with constructor config storage and execute() method. Test thoroughly to ensure full compatibility with existing functionality.

### Phase 3: Codex Adapter (Apply Pattern)

Apply the same pattern to Codex, using Claude as the reference. This validates that the pattern works for multiple adapters and ensures consistency.

### Phase 4: Cleanup & Integration

Delete all old code (client/, core/, factories/, old adapters/, old types/, session code). Update main exports in src/index.ts. Create Cursor/Gemini stubs. Update web app integration. Update examples and tests.

### Phase 5: Documentation & Validation

Rewrite README with new API patterns. Update CHANGELOG with breaking changes. Run full test suite to ensure no regressions. Manually test session continuation, streaming, and multi-agent patterns.

## Step by Step Tasks

### 1: Create Shared Directory and Simplify Utilities

<!-- prettier-ignore -->
- [x] 1.1 Create `src/shared/` directory
- [x] 1.2 Move `src/core/errors.ts` → `src/shared/errors.ts` (no modifications)
- [x] 1.3 Move `src/utils/spawn.ts` → `src/shared/spawn.ts` (no modifications)
- [x] 1.4 Move `src/utils/json-parser.ts` → `src/shared/json-parser.ts` (no modifications)
- [x] 1.5 Create `src/shared/logging.ts` - Simplified version
        - Single writeLog() function
        - Remove getLogPaths() - inline it
        - Remove createSessionMessageLogPath() - unused after deleting sessions
        - Remove all console.log statements (verbose debugging)
        - Keep only: mkdir, writeFile for input/output/error
        - Silently catch and ignore logging errors
        - File: `src/shared/logging.ts`

#### Completion Notes

- Created `src/shared/` directory structure
- Copied errors.ts, spawn.ts, and json-parser.ts as-is from their original locations
- Updated imports in spawn.ts and json-parser.ts to reference `./errors` instead of `../core/errors`
- Created simplified logging.ts with single `writeLog()` function
- Removed all console.log statements and verbose debugging
- Inlined path logic and removed helper functions (getLogPaths, createSessionMessageLogPath)
- Logging errors are silently caught and ignored as specified

### 2: Create Shared Base Types

<!-- prettier-ignore -->
- [x] 2.1 Create `src/shared/types.ts`
        - Define ExecutionOptions interface with all common options
        - Define ExecutionResponse<T> interface
        - Define StreamEvent, OutputData, TokenUsage, ModelUsage
        - Define ActionLog, ValidationResult
        - File: `src/shared/types.ts`
- [x] 2.2 Verify imports in shared utilities
        - Update imports in shared/spawn.ts to use ./types
        - Update imports in shared/logging.ts to use ./types
        - File: `src/shared/spawn.ts`, `src/shared/logging.ts`

#### Completion Notes

- Created `src/shared/types.ts` with all base type definitions from interfaces.ts
- Included StreamEvent, OutputData, TokenUsage, ModelUsage, ActionLog, ValidationResult
- Included ExecutionOptions and ExecutionResponse<T> as the core types
- Shared utilities (spawn.ts, logging.ts, json-parser.ts) don't need type imports as they use primitive types
- errors.ts already has no external dependencies

### 3: Create Claude Adapter Structure

<!-- prettier-ignore -->
- [x] 3.1 Create `src/claude/` directory
- [x] 3.2 Move `src/adapters/claude/cli-detector.ts` → `src/claude/cli-detector.ts`
- [x] 3.3 Move `src/adapters/claude/parser.ts` → `src/claude/parser.ts`
        - Rename parseStreamOutput → parseClaudeOutput
        - Update imports to use ../shared/
- [x] 3.4 Move `src/adapters/claude/image-handler.ts` → `src/claude/image-handler.ts` (if exists)
- [x] 3.5 Move `src/adapters/claude/mcp-detector.ts` → `src/claude/mcp-detector.ts` (if exists)
- [x] 3.6 Extract buildClaudeArgs from `src/adapters/claude/cli-wrapper.ts` → `src/claude/cli-args.ts`
        - Keep only buildClaudeArgs function
        - Remove executeClaudeCLI function (logic moves to adapter)
        - Update imports

#### Completion Notes

- Created `src/claude/` directory
- Copied cli-detector.ts, image-handler.ts, and mcp-detector.ts as-is
- Created new parser.ts with renamed function (parseStreamOutput → parseClaudeOutput)
- Updated all imports in parser.ts to use ../shared/ paths
- Created cli-args.ts with buildClaudeArgs function extracted from cli-wrapper.ts
- All Claude utility files now use the new modular structure

### 4: Create Claude Types and Events

<!-- prettier-ignore -->
- [x] 4.1 Create `src/claude/types.ts`
        - Define ClaudeOptions extends ExecutionOptions
        - Add Claude-specific options: model, apiKey, oauthToken, permissionMode, etc.
        - Define ClaudeConfig extends Partial<ClaudeOptions> with cliPath
        - File: `src/claude/types.ts`
- [x] 4.2 Move `src/types/events/claude.ts` → `src/claude/events.ts`
        - Keep all event types unchanged
        - Keep all type guards
        - Update imports to use ../shared/types

#### Completion Notes

- Created `src/claude/types.ts` with ClaudeOptions (extends ExecutionOptions), ClaudeConfig, ImageInput, and utility types
- Created `src/claude/events.ts` with all Claude event types (FileHistorySnapshotEvent, UserMessageEvent, AssistantMessageEvent)
- All type guards preserved (isClaudeEvent, isFileHistorySnapshotEvent, isUserMessageEvent, isAssistantMessageEvent)
- Updated imports to use ../shared/types (StreamEvent)
- Removed BaseStreamEvent dependency as part of simplification

### 5: Implement ClaudeAdapter Class

<!-- prettier-ignore -->
- [x] 5.1 Create `src/claude/index.ts` with ClaudeAdapter class
        - Implement constructor: store cliPath and config
        - Implement execute<T>() method
        - Merge constructor config with execute options
        - Inline prompt validation (4 lines): check non-empty string
        - Call buildClaudeArgs, spawnCLI, parseClaudeOutput
        - Add optional logging with writeLog
        - Export ClaudeAdapter, ClaudeOptions, ClaudeConfig, ClaudeStreamEvent
        - File: `src/claude/index.ts`
- [x] 5.2 Verify ClaudeAdapter compiles
        - Command: `pnpm check-types`
        - Expected: No TypeScript errors in Claude adapter

#### Completion Notes

- Created ClaudeAdapter class with constructor that auto-detects CLI path or uses config
- Implemented execute<T>() method with full streaming support (onEvent, onOutput callbacks)
- Config merging works correctly (constructor config + execute options)
- Inlined prompt validation as specified (4 lines)
- Integrated buildClaudeArgs, spawnProcess, parseClaudeOutput
- Added optional logging with writeLog
- Exports ClaudeAdapter, ClaudeOptions, ClaudeConfig, ClaudeStreamEvent, and all event type guards
- Fixed type issues by using BaseStreamEvent for Claude-specific events
- Type checking passes with zero errors

### 6: Create Codex Adapter Structure

<!-- prettier-ignore -->
- [ ] 6.1 Create `src/codex/` directory
- [ ] 6.2 Move `src/adapters/codex/cli-detector.ts` → `src/codex/cli-detector.ts`
- [ ] 6.3 Move `src/adapters/codex/parser.ts` → `src/codex/parser.ts`
        - Update imports to use ../shared/
- [ ] 6.4 Extract buildCodexArgs from `src/adapters/codex/cli-wrapper.ts` → `src/codex/cli-args.ts`
        - Keep only buildCodexArgs function
        - Update imports

#### Completion Notes

(To be filled in during implementation)

### 7: Create Codex Types and Events

<!-- prettier-ignore -->
- [ ] 7.1 Create `src/codex/types.ts`
        - Define CodexOptions extends ExecutionOptions
        - Add Codex-specific options
        - Define CodexConfig
        - File: `src/codex/types.ts`
- [ ] 7.2 Move `src/types/events/codex.ts` → `src/codex/events.ts`
        - Keep all event types unchanged
        - Keep all type guards
        - Update imports

#### Completion Notes

(To be filled in during implementation)

### 8: Implement CodexAdapter Class

<!-- prettier-ignore -->
- [ ] 8.1 Create `src/codex/index.ts` with CodexAdapter class
        - Follow same pattern as ClaudeAdapter
        - Implement constructor and execute() method
        - Inline prompt validation (same 4 lines as Claude)
        - Export CodexAdapter, CodexOptions, CodexConfig, CodexStreamEvent
        - File: `src/codex/index.ts`
- [ ] 8.2 Verify CodexAdapter compiles
        - Command: `pnpm check-types`
        - Expected: No TypeScript errors

#### Completion Notes

(To be filled in during implementation)

### 9: Create Cursor and Gemini Stubs

<!-- prettier-ignore -->
- [ ] 9.1 Create `src/cursor/index.ts` with stub adapter
        - Class with name='cursor'
        - Constructor throws "not yet implemented"
        - execute() throws "not yet implemented"
        - File: `src/cursor/index.ts`
- [ ] 9.2 Create `src/gemini/index.ts` with stub adapter
        - Class with name='gemini'
        - Constructor throws "not yet implemented"
        - execute() throws "not yet implemented"
        - File: `src/gemini/index.ts`

#### Completion Notes

(To be filled in during implementation)

### 10: Update Main Exports

<!-- prettier-ignore -->
- [ ] 10.1 Rewrite `src/index.ts`
        - Export ClaudeAdapter, CodexAdapter, CursorAdapter, GeminiAdapter
        - Export all shared types (ExecutionResponse, ExecutionOptions, etc.)
        - Export Claude types and events
        - Export Codex types and events
        - Export all errors from shared/errors
        - Export json-parser utilities (extractJSON, parseJSONL, safeJSONParse)
        - Export type guards from adapter events
        - Add getAdapter(agent, config) helper function
        - Add version constant '4.0.0'
        - File: `src/index.ts`
- [ ] 10.2 Verify all exports resolve
        - Command: `pnpm build`
        - Expected: Successful build with all exports

#### Completion Notes

(To be filled in during implementation)

### 11: Delete Old Code

<!-- prettier-ignore -->
- [ ] 11.1 Delete old architecture
        - Delete `src/client/` directory
        - Delete `src/core/` directory
        - Delete `src/factories/` directory
        - Delete `src/adapters/` directory
        - Delete `src/types/` directory
        - Delete `src/utils/` directory
- [ ] 11.2 Delete obsolete examples
        - Delete `examples/sessions/` directory
        - Delete `examples/advanced/` directory
        - Delete `examples/README.md`
- [ ] 11.3 Delete obsolete tests
        - Delete `tests/unit/client/` directory
        - Delete `tests/integration/` directory
        - Delete `tests/unit/adapters/` directory
- [ ] 11.4 Verify build still works
        - Command: `pnpm build`
        - Expected: Clean build with no errors

#### Completion Notes

(To be filled in during implementation)

### 12: Update Examples

<!-- prettier-ignore -->
- [ ] 12.1 Update `examples/basic/claude.ts`
        - Use new ClaudeAdapter constructor
        - Update execute() call
        - File: `examples/basic/claude.ts`
- [ ] 12.2 Update `examples/basic/codex.ts`
        - Use new CodexAdapter constructor
        - Update execute() call
        - File: `examples/basic/codex.ts`
- [ ] 12.3 Create `examples/session-continuation.ts`
        - Show first message, capture sessionId
        - Show second message with sessionId + resume
        - File: `examples/session-continuation.ts`
- [ ] 12.4 Create `examples/streaming.ts`
        - Show onOutput callback usage
        - File: `examples/streaming.ts`
- [ ] 12.5 Create `examples/multi-agent.ts`
        - Show getAdapter() usage
        - File: `examples/multi-agent.ts`
- [ ] 12.6 Update `examples/structured-output.ts` (if exists)
        - Update to new adapter API
        - File: `examples/structured-output.ts`

#### Completion Notes

(To be filled in during implementation)

### 13: Update Tests

<!-- prettier-ignore -->
- [ ] 13.1 Create `tests/unit/claude/adapter.test.ts`
        - Test ClaudeAdapter constructor
        - Test execute() method
        - File: `tests/unit/claude/adapter.test.ts`
- [ ] 13.2 Create `tests/unit/codex/adapter.test.ts`
        - Test CodexAdapter constructor
        - Test execute() method
        - File: `tests/unit/codex/adapter.test.ts`
- [ ] 13.3 Move parser tests
        - Move `tests/unit/adapters/claude/parser.test.ts` → `tests/unit/claude/parser.test.ts`
        - Update imports
- [ ] 13.4 Move utility tests
        - Move `tests/unit/utils/json-parser.test.ts` → `tests/unit/shared/json-parser.test.ts`
        - Move `tests/unit/utils/spawn.test.ts` → `tests/unit/shared/spawn.test.ts`
        - Delete `tests/unit/utils/validation.test.ts` (validation.ts deleted)
        - Update imports in all moved tests
- [ ] 13.5 Update E2E tests
        - Update `tests/e2e/claude-e2e.test.ts` to use ClaudeAdapter
        - Update `tests/e2e/codex-e2e.test.ts` to use CodexAdapter
- [ ] 13.6 Run all tests
        - Command: `pnpm test`
        - Expected: All tests passing

#### Completion Notes

(To be filled in during implementation)

### 14: Update Web App Integration

<!-- prettier-ignore -->
- [ ] 14.1 Update `apps/web/src/server/websocket.ts`
        - Replace: `import { AgentClient, createClaudeAdapter }`
        - With: `import { ClaudeAdapter }`
        - Replace AgentClient instantiation with ClaudeAdapter
        - Update ActiveSessionData type (agentClient → adapter)
        - Update all execute() calls
        - File: `apps/web/src/server/websocket.ts`
- [ ] 14.2 Verify web app compiles
        - Command: `cd apps/web && pnpm check-types`
        - Expected: No TypeScript errors
- [ ] 14.3 Test web app websocket functionality
        - Start: `cd apps/web && pnpm dev`
        - Send test message through websocket
        - Verify agent executes correctly

#### Completion Notes

(To be filled in during implementation)

### 15: Update Documentation

<!-- prettier-ignore -->
- [ ] 15.1 Rewrite `README.md`
        - Update Quick Start section with new API
        - Add Session Continuation section (sessionId + resume pattern)
        - Add Streaming section (onOutput callbacks)
        - Add Multi-Agent Usage section (getAdapter())
        - Update all code examples
        - Add API Reference for adapters
        - File: `README.md`
- [ ] 15.2 Update `CHANGELOG.md`
        - Add 4.0.0 section with breaking changes
        - List removed features
        - List new patterns
        - Include migration note (no backwards compatibility)
        - File: `CHANGELOG.md`
- [ ] 15.3 Update `package.json`
        - Set version to "4.0.0"
        - File: `package.json`

#### Completion Notes

(To be filled in during implementation)

## Acceptance Criteria

**Must Work:**

- [ ] ClaudeAdapter executes prompts successfully
- [ ] CodexAdapter executes prompts successfully
- [ ] Session continuation works (sessionId + resume)
- [ ] Streaming works (onOutput callbacks)
- [ ] Event types are preserved (ClaudeStreamEvent, CodexStreamEvent)
- [ ] getAdapter() helper returns correct adapter
- [ ] Web app websocket integration works
- [ ] All existing unit tests pass (after migration)
- [ ] All existing E2E tests pass (after migration)
- [ ] Type checking passes with zero errors
- [ ] Build completes successfully
- [ ] Structured output validation works (Zod schema)

**Should Not:**

- [ ] Break any existing functionality
- [ ] Introduce type errors or warnings
- [ ] Cause performance regressions
- [ ] Break web app integration
- [ ] Lose event type safety

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd packages/agent-cli-sdk
pnpm build
# Expected: Clean build, dist/ contains compiled code

# Type checking
pnpm check-types
# Expected: 0 errors, 0 warnings

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests
pnpm test
# Expected: All tests pass (adapt existing tests to new structure)

# E2E tests (Claude)
RUN_E2E_TESTS=true pnpm test:e2e:claude
# Expected: Claude E2E tests pass

# E2E tests (Codex)
RUN_E2E_TESTS=true pnpm test:e2e:codex
# Expected: Codex E2E tests pass

# Web app type checking
cd ../../apps/web
pnpm check-types
# Expected: 0 errors
```

**Manual Verification:**

1. Test basic execution:
   ```bash
   cd packages/agent-cli-sdk
   tsx examples/basic/claude.ts
   # Verify: Executes successfully, prints response
   ```

2. Test session continuation:
   ```bash
   tsx examples/session-continuation.ts
   # Verify: Two messages in same session, second remembers context
   ```

3. Test streaming:
   ```bash
   tsx examples/streaming.ts
   # Verify: Output streams to console in real-time
   ```

4. Test multi-agent:
   ```bash
   tsx examples/multi-agent.ts claude
   tsx examples/multi-agent.ts codex
   # Verify: Both agents execute correctly
   ```

5. Test web app integration:
   ```bash
   cd apps/web
   pnpm dev
   # Navigate to session page, send message
   # Verify: Message executes, streams back to UI
   ```

**Feature-Specific Checks:**

- Import ClaudeAdapter from package, verify TypeScript autocomplete works
- Verify event types (ClaudeStreamEvent) provide proper type narrowing
- Check that sessionId is captured and can be reused
- Verify config merging (constructor config + execute options)
- Test error handling (invalid CLI path, authentication errors)
- Verify logging works when logPath is provided
- Check that Cursor/Gemini stubs throw appropriate errors

## Definition of Done

- [ ] All tasks completed and marked as done
- [ ] All automated tests passing (unit, E2E)
- [ ] TypeScript compiles with zero errors
- [ ] Linting passes
- [ ] Manual testing confirms all features work
- [ ] Web app integration tested and working
- [ ] No console errors or warnings
- [ ] Examples run successfully
- [ ] Documentation updated (README, CHANGELOG)
- [ ] Code follows new flat architecture pattern
- [ ] Version bumped to 4.0.0

## Notes

**Key Design Decisions:**
- Keep event types unchanged for type safety (ClaudeStreamEvent, CodexStreamEvent with all subtypes)
- Simplify utilities where possible: inline prompt validation, simplify logging, delete unused code
- Delete async.ts and validation.ts entirely (unused in codebase)
- No backwards compatibility - clean break to 4.0.0
- Lightweight classes over pure functions (config reuse pattern matches web app usage)

**Utility Simplifications:**
- **validation.ts** - DELETE (all functions unused, inline 4-line prompt check in adapters)
- **async.ts** - DELETE (sequential, parallel, retry, withTimeout, debounce all unused)
- **logging.ts** - SIMPLIFY (remove verbose console.logs, inline helpers, single writeLog function)
- **spawn.ts** - KEEP AS-IS (actively used, well-tested)
- **json-parser.ts** - KEEP AS-IS (actively used, well-tested)

**Dependencies:**
- Web app depends on this package, must update after refactor
- Tests must be migrated alongside code to maintain coverage

**Future Considerations:**
- Cursor adapter implementation (stub is ready)
- Gemini adapter implementation (stub is ready)
- Potential for additional shared utilities as patterns emerge
- Consider adding retry/timeout utilities if needed in the future

**Rollback Plan:**
- If issues arise, revert to 3.x.x version in package.json
- Web app would need to revert websocket.ts changes
- Tests are preserved during migration, so rollback is low-risk
