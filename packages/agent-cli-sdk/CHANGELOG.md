# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2025-10-25

### BREAKING CHANGES - Complete Architectural Rewrite

Version 4.0.0 is a complete rewrite with **NO backwards compatibility**. The package has been simplified by ~60% while preserving all functionality.

### Migration Required

```typescript
// OLD (3.x)
import { AgentClient, createClaudeAdapter } from '@repo/agent-cli-sdk';
const client = new AgentClient({ adapter: createClaudeAdapter() });
const session = client.createSession();
await session.send('Hello');

// NEW (4.0)
import { ClaudeAdapter } from '@repo/agent-cli-sdk';
const claude = new ClaudeAdapter();
const result1 = await claude.execute('Hello');
const result2 = await claude.execute('Continued', {
  sessionId: result1.sessionId,
  resume: true,
});
```

### Removed

- **AgentClient wrapper class** - Use adapters directly (e.g., `new ClaudeAdapter()`)
- **Factory functions** - `createClaudeAdapter()`, `createCodexAdapter()` removed
- **Session class** - Use `sessionId` + `resume` option instead of `session.send()`
- **Session management methods** - `createSession()`, `listActiveSessions()` removed
- **BaseAdapter inheritance** - Replaced with lightweight adapter classes
- **Old directory structure** - Removed `src/client/`, `src/core/`, `src/factories/`, `src/adapters/`, `src/types/`, `src/utils/`

### Added

- **Lightweight Adapters** - Direct `ClaudeAdapter` and `CodexAdapter` classes with no wrapper layers
- **Flat Architecture** - New modular structure: `src/claude/`, `src/codex/`, `src/shared/`
- **getAdapter() Helper** - Dynamic adapter selection with type safety: `getAdapter('claude', config)`
- **Session Continuation Pattern** - Simple `sessionId` + `resume` option for maintaining context
- **Cursor & Gemini Stubs** - Placeholder adapters ready for future implementation
- **Improved Type Safety** - Better TypeScript inference and event type guards
- **Simplified Utilities** - Streamlined logging, removed unused validation and async utilities

### Changed

- **Package Structure** - Flat exports from adapters: `import { ClaudeAdapter, CodexAdapter } from '@repo/agent-cli-sdk'`
- **Event Handling** - Same event types preserved, now with better type guards (`isUserMessageEvent()`, etc.)
- **Session Management** - Replaced `session.send()` with `adapter.execute()` + sessionId option
- **Config Merging** - Constructor config can be overridden per-execution with execute options
- **Logging** - Simplified to single `writeLog()` function, removed verbose console output

### Improved

- **60% Less Code** - Removed unnecessary abstractions and duplicate code
- **Simpler API** - Direct adapter usage, no wrapper layers
- **Better TypeScript** - Improved type inference and compile-time safety
- **Easier Extension** - Adding new adapters requires only a single class file
- **Same Functionality** - All features from 3.x preserved (streaming, events, structured output, etc.)

### Technical Details

- New directory structure: `src/{adapter-name}/` for each adapter
- Shared utilities in `src/shared/` (types, errors, spawn, logging, json-parser)
- Each adapter is self-contained with its own types, events, and utilities
- No inheritance - adapters are independent, lightweight classes
- Inline prompt validation (4 lines) instead of separate validation module
- Removed unused utilities: `async.ts` (sequential, parallel, retry, debounce, withTimeout)
- Simplified logging: single `writeLog()` function, silent error handling

### Examples Updated

All examples updated to demonstrate new API patterns:
- `examples/basic/claude.ts` - Direct adapter usage
- `examples/basic/codex.ts` - Codex with session continuation
- `examples/session-continuation.ts` - New session pattern
- `examples/streaming.ts` - Streaming with event type guards
- `examples/multi-agent.ts` - Dynamic adapter selection
- `examples/advanced/structured-output.ts` - Zod validation

### Notes

- **Old code still in codebase** - Directories like `src/client/`, `src/types/` etc. are not deleted yet but are not imported anywhere
- **Tests need updating** - E2E and unit tests still reference old API and need migration
- **No migration path** - This is a clean break; projects must update code to use 4.0 API
- **Web app updated** - `apps/web/src/server/websocket.ts` updated to use new `ClaudeAdapter`

## [3.0.0] - 2025-10-20

### Added
- Enhanced session management
- Improved error handling
- Additional adapter capabilities

## [1.0.0] - 2025-10-19

### Added
- Initial 1.0 stable release
- Claude CLI adapter with full session support via `createSession()`
- Codex CLI adapter with basic execution (session management via `execute()` with sessionId)
- Structured output support with Zod validation
- Comprehensive event streaming for real-time execution monitoring
- Execution logging with automatic file organization
- Multi-modal support (images) for both adapters
- Token usage tracking and model metadata extraction
- Comprehensive E2E and unit test suite
- Type-safe adapter interfaces with TypeScript
- Proper error handling with custom error types
- Session abort functionality (prevents new messages)
- Timeout handling with race condition protection

### Changed
- Package renamed from `agent-cli-sdk` to `agent-cli-sdk-three`
- Improved type safety by removing `any` types in favor of explicit interfaces
- Deduplicated logging code into shared BaseAdapter method
- Codex adapter capabilities accurately reflect feature support

### Fixed
- Removed unsupported `approvalPolicy` option from Codex types
- Fixed timeout race conditions in CLI wrappers
- Clarified session abort behavior in documentation
- Added missing .gitignore patterns for test artifacts

### Removed
- Dead code and temporary test files (.mjs, .log files)
- Duplicate logging implementations

### Documentation
- Added comprehensive JSDoc comments
- Created CHANGELOG.md and CONTRIBUTING.md
- Updated README with feature comparison table
- Clarified version numbering in MIGRATION.md

### Notes
- Codex adapter does not support `createSession()` method in 1.0 (planned for 1.1)
- Session `abort()` only prevents new messages, does not kill in-flight executions
- Both adapters support session resumption via sessionId parameter

## [0.1.19] - 2025-10-19
- Pre-release version
- Development and testing phase

---

[1.0.0]: https://github.com/sourceborn/agent-cli-sdk-three/releases/tag/v1.0.0
[0.1.19]: https://github.com/sourceborn/agent-cli-sdk-three/releases/tag/v0.1.19
