# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Building and Development

```bash
pnpm build              # Build with bunchee (outputs to dist/)
pnpm dev                # Watch mode for development
pnpm check              # Run all checks (tests + types + lint)
```

### Testing

```bash
pnpm test               # Run unit tests (Vitest)
pnpm test:watch         # Run tests in watch mode
pnpm test:e2e           # Run E2E tests (180s timeout, sequential)
```

**Important**: To run a single test file:

```bash
pnpm vitest run src/path/to/file.test.ts           # Single unit test
pnpm vitest run tests/e2e/claude/basic.test.ts     # Single E2E test
```

### Quality Checks

```bash
pnpm check-types        # TypeScript type checking (tsc --noEmit)
pnpm lint               # ESLint on src/**/*.ts
pnpm format             # Format with Prettier
```

### Utilities

```bash
pnpm extract-claude-fixtures    # Extract Claude session fixtures (via tsx)
```

## Architecture Overview

This is a TypeScript SDK for orchestrating AI-powered CLI tools (currently Claude Code only, with planned support for Codex/Gemini/Cursor). The SDK provides a unified API for executing AI CLI commands programmatically and loading/parsing session histories.

### Core Components

**Main Entry Point** (`src/index.ts`)

- Exports unified `loadMessages()` and `execute()` functions
- Routes to tool-specific implementations (currently only Claude)
- Uses exhaustive type checking pattern for tool selection

**Claude Implementation** (`src/claude/`)

- `execute.ts`: Spawns Claude CLI process, monitors JSONL output streams, handles callbacks
- `loadSession.ts`: Reads session files from `~/.claude/projects/{encoded-path}/{sessionId}.jsonl`
- `parse.ts`: Converts Claude JSONL events to UnifiedMessage format
- `detectCli.ts`: Detects Claude CLI installation path
- `types.ts`: Claude-specific types and events

**Unified Types** (`src/types/unified.ts`)

- `UnifiedMessage`: Standardized message format across AI tools
- `UnifiedContent`: Union of content blocks (text, thinking, tool_use, tool_result, slash_command)
- Tool-specific input types (BashToolInput, ReadToolInput, WriteToolInput, etc.)
- Type guard functions for each tool type

**Utilities** (`src/utils/`)

- `spawn.ts`: Process spawning abstraction with callbacks and timeout handling
- `extractJson.ts`: Extract and validate JSON from text (supports Zod schemas)

### Data Flow

1. **Execute Flow**:
   - User calls `execute()` → routes to `executeClaudeCommand()`
   - Spawns Claude CLI with args built from options
   - Streams JSONL output line-by-line via `spawnProcess()`
   - Each line parsed by `parse()` into UnifiedMessage
   - Callbacks invoked with events/messages in real-time
   - Returns ExecuteResult with messages, session ID, extracted data

2. **Load Session Flow**:
   - User calls `loadMessages()` → routes to `loadClaudeSession()`
   - Reads `~/.claude/projects/{encoded-path}/{sessionId}.jsonl`
   - Parses each line with `parse()`, filters nulls, sorts by timestamp
   - Returns UnifiedMessage array

### Key Patterns

**JSONL Streaming Parser**: The execute function uses line buffering to handle streaming JSONL output from Claude CLI without blocking.

**Unified Message Format**: All AI CLI outputs are normalized to UnifiedMessage with typed content blocks, enabling tool-agnostic processing.

**Permission Modes**: Claude execution supports safety modes:

- `default`: Standard mode with permission prompts
- `plan`: Read-only analysis mode
- `acceptEdits`: Auto-accepts file edits
- `bypassPermissions`: Dangerous mode for isolated environments

**Session ID Encoding**: Claude encodes project paths by replacing `/` with `-` (e.g., `/Users/john/project` → `-Users-john-project`)

## Testing Strategy

**Unit Tests**: Co-located with source files (e.g., `parse.test.ts` next to `parse.ts`)

- Test parsing logic, CLI detection, JSON extraction, spawn utilities
- Fast, no external dependencies

**E2E Tests** (`tests/e2e/claude/`):

- `basic.test.ts`: Basic command execution
- `json.test.ts`: JSON extraction
- `resume.test.ts`: Session resumption
- Run sequentially (singleFork: true) to avoid conflicts
- Long timeout (180s) for real Claude CLI interactions

**Fixtures** (`tests/fixtures/claude/`):

- Individual tool JSONL examples (bash, read, write, edit, etc.)
- Full session examples for integration testing
- Generated via `extract-claude-fixtures` script

## TypeScript Configuration

**Strict Mode**: Full strict type checking enabled with additional strictness:

- `noUncheckedIndexedAccess: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

**Module System**: ESM-only (`type: "module"`)

- `moduleResolution: "bundler"`
- `target: "ES2022"`

**Build**: Bunchee handles bundling with declaration files, source maps, and declaration maps

## Code Style

**ESLint**: TypeScript recommended + requiring type checking

- Unused vars with `_` prefix ignored
- `any` type is warning, not error
- Type-safety rules relaxed for dynamic JSON handling

**Naming Conventions**:

- Unused variables: prefix with `_` (e.g., `const _exhaustive: never`)
- Private functions: not exported from module
- Type guards: `isBashTool()`, `isReadTool()`, etc.

## Unit Test Location

**Critical**: Unit tests MUST be co-located with source files in the same directory, not in a separate `tests/` folder. Example:

- `src/claude/parse.ts` → `src/claude/parse.test.ts`
- `src/utils/spawn.ts` → `src/utils/spawn.test.ts`

## Important Conventions

1. **Unit tests are co-located with source files** (e.g., `parse.ts` → `parse.test.ts`)
2. **JSONL parsing errors are silently skipped** (don't throw, just continue)
3. **Execute function returns errors, doesn't throw** (use `ExecuteResult.success: false`)
4. **Use exhaustive type checking with `never`** for tool selection switches
5. **Session path encoding**: Replace `/` with `-` (e.g., `/Users/john/project` → `-Users-john-project`)
6. **Line buffering for JSONL streams** to handle large outputs without blocking
7. **`--session-id`, `--continue`, and `--resume` are mutually exclusive**
8. **Permission modes**: Default to `'default'` for safety, use `'acceptEdits'` for automation, never use `'bypassPermissions'` in production
9. **E2E tests run sequentially** (`singleFork: true`) to avoid session conflicts
10. **Type guards over type assertions** when working with UnifiedContent blocks
