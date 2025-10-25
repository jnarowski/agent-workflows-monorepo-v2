# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test, and Development Commands

### Building
```bash
pnpm build              # Build using tsdown (ESM bundler)
pnpm check-types        # Type-check without emitting
```

### Testing
```bash
pnpm test               # Run unit tests with Vitest
pnpm test:watch         # Run tests in watch mode
pnpm check              # Run all checks: tests + type-check + lint

# E2E tests (require real CLI installations)
pnpm test:e2e           # Run all E2E tests (requires Claude Code & Codex CLIs)
pnpm test:e2e:claude    # Run Claude-specific E2E tests
pnpm test:e2e:codex     # Run Codex-specific E2E tests
```

**E2E Test Requirements:**
- E2E tests require `RUN_E2E_TESTS=true` environment variable
- Claude tests require Claude Code CLI installed (claude.ai/download)
- Codex tests require OpenAI Codex CLI installed
- Use `vitest.e2e.config.ts` for E2E tests (90s timeout, no setup file)
- Regular unit tests use `vitest.config.ts` (excludes E2E directory)

### Running Single Tests
```bash
pnpm vitest run tests/unit/shared/json-parser.test.ts        # Single unit test
pnpm vitest run tests/e2e/claude-e2e.test.ts                 # Single E2E test
```

### Linting and Formatting
```bash
pnpm lint               # ESLint check
pnpm format             # Prettier format all files
```

## Architecture

This is a **TypeScript SDK for orchestrating AI-powered CLI tools** (Claude Code, OpenAI Codex). Version 4.0.0 represents a complete rewrite with **60% less code** and **no backwards compatibility** with 3.x.

### Core Design Principles

1. **Direct Adapter Pattern** - No wrapper classes, no inheritance, no `AgentClient`
2. **Lightweight Implementation** - Each adapter is self-contained with minimal abstractions
3. **Type-Safe Events** - Adapter-specific event types with TypeScript type guards
4. **Streaming First** - JSONL parsing with real-time callbacks (`onOutput`, `onEvent`)
5. **Session Continuation** - Built-in session management via `sessionId` and `resume`
6. **Structured Output** - JSON extraction with optional Zod schema validation

### Directory Structure

```
src/
├── claude/              # Claude Code adapter
│   ├── index.ts         # ClaudeAdapter class
│   ├── types.ts         # Config & options types
│   ├── events.ts        # Event types & type guards
│   ├── cli-args.ts      # CLI argument builder
│   ├── cli-detector.ts  # Auto-detect CLI path
│   ├── parser.ts        # Parse JSONL output into ExecutionResponse
│   ├── image-handler.ts # Image file handling
│   └── mcp-detector.ts  # MCP server detection
├── codex/               # OpenAI Codex adapter (similar structure)
├── cursor/              # Cursor adapter (stub)
├── gemini/              # Gemini adapter (stub)
├── shared/              # Shared utilities
│   ├── types.ts         # Base types (ExecutionResponse, StreamEvent, etc.)
│   ├── errors.ts        # Error classes (ValidationError, CLINotFoundError, etc.)
│   ├── spawn.ts         # Cross-platform process spawning with cross-spawn
│   ├── logging.ts       # File logging utilities
│   └── json-parser.ts   # JSON utilities (extractJSON, parseJSONL, safeJSONParse)
└── index.ts             # Main exports & getAdapter() helper
```

### Adapter Lifecycle

Each adapter follows the same pattern:

1. **Construction** - Auto-detect CLI path or use provided `cliPath`
2. **Argument Building** - `buildClaudeArgs()` / `buildCodexArgs()` translate options to CLI flags
3. **Process Spawning** - `spawnProcess()` from `shared/spawn.ts` handles execution
4. **JSONL Streaming** - Parse stdout line-by-line into `StreamEvent[]`
5. **Event Emission** - Call `onEvent()` and `onOutput()` callbacks in real-time
6. **Response Parsing** - `parseClaudeOutput()` / `parseCodexOutput()` extract final output, session ID, token usage
7. **Structured Output** - Optional JSON extraction/validation via `responseSchema`

### Key Implementation Details

**Session Management:**
- `sessionId` alone = create new session with specific ID
- `sessionId + resume: true` = continue existing session
- `continue: true` = continue last session (Claude-specific)
- All three are mutually exclusive

**Streaming:**
- Default is `streaming: true` (uses `--output-format stream-json` for Claude)
- Line buffer accumulates stdout chunks and splits on `\n`
- Each line is parsed as JSONL and emitted via `onEvent()`
- Text content is extracted and provided via `onOutput({ text, accumulated })`

**Synthetic Events:**
- Claude adapter emits synthetic `turn.started`, `turn.completed`, `text`, `tool.started`, `tool.completed` events for backward compatibility
- These are generated from `assistant` and `user` message events

**Error Handling:**
- Adapters throw domain-specific errors: `ValidationError`, `CLINotFoundError`, `ExecutionError`, `TimeoutError`, `ParseError`, `SessionError`
- All extend `AgentSDKError` base class
- Exit code != 0 results in `status: 'error'` with error details in `response.error`

**Structured Output:**
- `responseSchema: true` - Extract first JSON object/array using `extractJSON()`
- `responseSchema: ZodSchema` - Extract and validate JSON using Zod's `safeParse()`
- Throws `ParseError` if extraction/validation fails

## Testing Conventions

- **Unit tests** live in `tests/unit/` and mirror the source structure
- **E2E tests** live in `tests/e2e/` and require real CLI installations
- Tests use Vitest with Node environment
- Use `tests/setup.ts` for shared test setup (currently empty)
- E2E tests have 90s timeout and skip setup file to avoid mocked CLI paths

## TypeScript Configuration

- Target: ES2022, Module: ESNext, Resolution: bundler
- Strict mode enabled with additional strictness flags:
  - `noUncheckedIndexedAccess: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noImplicitReturns: true`
- Source: `src/`, Output: `dist/`
- Exclude: `tests/` and `src/types/__type-tests__/`

## Important Notes

- **ESM-only package** (`"type": "module"` in package.json)
- Uses `cross-spawn` for cross-platform process spawning
- Requires Node.js >= 22.0.0
- Peer dependency: Zod 3.x or 4.x (optional)
- Build tool: `tsdown` (not tsc)
- All exports are from `src/index.ts` (adapters, types, errors, utilities, type guards)
