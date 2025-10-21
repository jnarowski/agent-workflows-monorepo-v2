# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@spectora/agent-workflows`, a TypeScript library for building traceable, stateful workflows that combine AI-powered steps (via CLI adapters) with custom business logic. The library provides automatic state persistence, logging, and error handling for multi-step automated workflows using a clean, config-based API with pluggable adapters.

## Development Commands

```bash
# Install dependencies
pnpm install

# Build (generates dist/ with CJS, ESM, and type declarations)
pnpm build

# Development with watch mode
pnpm dev

# Run tests
pnpm test           # Single run
pnpm test:watch     # Watch mode

# Linting
pnpm lint           # Check for issues
pnpm lint:fix       # Auto-fix issues

# Type checking
pnpm check-types    # Run TypeScript type checker without emitting files

# Validation (runs lint, type check, and tests)
pnpm check          # Run all validation checks

# Run examples
bun run examples/workflow-simple.ts        # Basic workflow with mock adapter
bun run examples/workflow-claude.ts        # Real Claude CLI integration
```

## Architecture Overview

### Core Components & Data Flow

The library uses a **clean adapter pattern** with config-based APIs:

```
generateWorkflowId() → Workflow(adapter) → executeStep/executeCliStep → Cli Persistence
```

1. **Workflow**: Main orchestration class that accepts pluggable storage adapters
2. **BaseStorage**: Abstract base class defining the contract for all storage adapters
3. **FileStorage**: Filesystem implementation that persists state to `.agent/workflows/logs/{id}/state.json`
4. **CLI Adapters**: External tools that implement the `Cli` interface (Claude, Codex, etc.) from `@sourceborn/agent-cli-sdk`

### Key Design Patterns

**Config-Based API**: All classes and methods accept configuration objects instead of individual parameters:

```typescript
// Create workflow with config
const workflow = new Workflow({
  storage: new FileStorage({ workflowId, stateDir: '.agent/workflows/logs' }),
});

// Execute steps with name and config (step numbers auto-increment)
await workflow.executeStep('analyze', {
  fn: async () => ({ analyzed: true }),
});
console.log(workflow.currentStepNumber); // 1
```

**Pluggable Storage**: The adapter pattern allows swapping persistence backends without changing workflow code:

- `FileStorage`: Filesystem persistence (current)
- Future: Database storage, cloud storage, etc.

**Automatic Status Tracking**: Steps automatically transition through states:

- `pending` → `running` → `completed` (on success)
- `pending` → `running` → `failed` (on error)

**State Management**: Workflows track state including:

- Workflow ID, branch name, created/updated timestamps
- `completedAt` timestamp (automatically set when status becomes "completed")
- Overall workflow status
- Per-step status tracking via `stepStatuses` map
- Step results organized in `steps` namespace for clean separation

**Graceful Error Handling**:

- All public workflow methods use Result pattern for predictable error handling
- `executeStep()` records failure in state, returns `Result<T, string>`
- `executeCliStep()` records failure in state, returns `Result<CliResponse, string>`
- `Workflow.load()` returns `Result<Workflow, string>`
- `FileStorage.load()` returns `Result<FileStorage, string>`
- `ensureBranch()` returns `Result<EnsureBranchResult, string>`

**Automatic Logging**: All steps log with emoji indicators (🚀 starting, ✅ completed, ❌ failed) and auto-incrementing step numbers.

**Auto-Generated Log Paths**: For FileStorage, `executeCliStep()` automatically generates logPath: `.agent/workflows/logs/{id}/step-{number}-{name}/`

### Module Organization

- `src/workflow/`: Core workflow orchestration
  - `Workflow.ts`: Main workflow class with step execution methods
- `src/storage/`: Storage adapter implementations
  - `BaseStorage.ts`: Abstract base class with core state management methods
  - `FileStorage.ts`: Filesystem persistence implementation
- `src/types/`: TypeScript interfaces and type definitions
  - `workflow.ts`: Core types (Cli, CliResponse, WorkflowStateData)
  - `utils.ts`: Claude Code CLI types (RetryCode, ClaudeCodeConfig, etc.)
- `src/utils/`: Helper utilities
  - `generateWorkflowId.ts`: Human-readable timestamp-based workflow ID generation (includes internal name sanitization)
  - `formatConsoleJson.ts`: Syntax-highlighted JSON output
  - `renderConsoleBox.ts`: Styled console boxes
  - `logger.ts`: Pipeline logging utilities
- `src/examples/`: Reference implementations
  - `workflow-simple.ts`: Basic workflow example with mock adapter
  - `workflow-with-adapter.ts`: Advanced example showing state management and branch tracking

## API Usage Examples

### Creating a Workflow

```typescript
import { Workflow, FileStorage, generateWorkflowId } from '@spectora/agent-workflows';

// Generate human-readable ID: YYYYMMDDHHMMSS-feature-name
const workflowId = generateWorkflowId('User Authentication');
const workflow = new Workflow({
  storage: new FileStorage({ workflowId }),
});

// Access workflow ID
console.log(workflow.id); // "20251018143022-user-authentication" (readonly property)

// Set state properties
await workflow.setState({
  branchName: 'feat/new-feature',
  status: 'running',
});
```

### Executing Steps

```typescript
import { unwrap } from '@spectora/agent-workflows';

// Generic step (custom async function) - using unwrap for fail-fast
const analyzeData = unwrap(
  await workflow.executeStep("analyze", {
    fn: async () => {
      // Your custom logic here
      return { analyzed: true, findings: [...] };
    }
  })
);
console.log(workflow.currentStepNumber); // 1 (auto-incremented)

// Or handle errors explicitly with Result pattern
const result = await workflow.executeStep("analyze", {
  fn: async () => ({ analyzed: true })
});

if (!result.ok) {
  console.error("Step failed:", result.error);
  return;
}
console.log("Success:", result.data);
console.log("Step number:", workflow.currentStepNumber); // Tracks completed steps

// Access step results from steps namespace
const analyzeResult = workflow.getStepState("analyze");
// or directly from state
const state = workflow.getState();
console.log(state.steps?.analyze); // { analyzed: true, findings: [...] }

// CLI adapter step (AI-powered) - returns Result<CliResponse, string>
const cliResult = unwrap(
  await workflow.executeCliStep("plan", {
    cli: claude,
    prompt: "Create implementation plan",
    cliOptions: { model: "sonnet" }
  })
);
console.log(workflow.currentStepNumber); // 2 (auto-incremented)

// Set step state manually using convenience method
await workflow.setStepState("custom", { data: "value" });
```

### Loading Existing Workflows

```typescript
const result = await Workflow.load({
  storage: new FileStorage({ workflowId: 'existing-id' }),
});

if (!result.ok) {
  console.error('Failed to load workflow:', result.error);
  return;
}

const workflow = result.data;
const state = workflow.getState();
console.log('Status:', state.status);
console.log('Branch:', state.branchName);
```

## Build System

**Tool**: tsdown (replacement for tsup)

- Outputs CommonJS (`dist/index.js`), ESM (`dist/index.mjs`), and TypeScript declarations
- Watch mode available via `pnpm dev`
- Source maps and declaration maps generated for debugging

**TypeScript Config**: Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`

**Linting**: ESLint with typescript-eslint, where `@typescript-eslint/no-explicit-any` is set to `warn` level (not error)

## Testing

- **Framework**: Vitest with Node environment
- **Globals**: Test globals enabled (`describe`, `it`, `expect`)
- **Coverage**: Comprehensive test suite covering:
  - `BaseStorage.test.ts`: Abstract base class contract testing
  - `FileStorage.test.ts`: Filesystem persistence, state management, step status tracking
  - `Workflow.test.ts`: Step execution, status updates, factory methods

**Test Utilities**: Mock adapters and test state directories used throughout tests

## Type Safety Guidelines

- All constructors and methods use config objects (not individual parameters)
- Replace `any` with `unknown` or `Record<string, unknown>` for generic data structures
- Use generic type parameters (e.g., `ExecuteStepConfig<T>`) for typed return values
- Cli options use union types: `ClaudeExecutionOptions | CodexExecutionOptions`
- Config interfaces extend base configs: `FileStorageConfig extends BaseStorageConfig`

## State Persistence Behavior

All workflow state is written to disk automatically (when using FileStorage):

- **Location**: `.agent/workflows/logs/{workflowId}/state.json`
- **Format**: Flat JSON structure containing all workflow state in a single object
- **State Fields**: `workflowId`, `branchName`, `createdAt`, `updatedAt`, `completedAt` (optional), `status`, `stepStatuses`, `steps`
- **Automatic completedAt**: When workflow status is set to "completed", `completedAt` is automatically set to the current ISO timestamp (only if not already set)
- **Steps Namespace**: Step results stored in `steps` object (e.g., `steps.analyze`, `steps.plan`)
- **Failure Recording**: Errors stored with `{ error: true, message, timestamp, stack }` in the steps namespace
- **Loading**: Use `Workflow.load({ adapter })` to retrieve existing workflows

## Adapter Integration Pattern

### CLI Adapters (External)

External CLI tools implement the `Cli` interface:

```typescript
interface Cli {
  execute(prompt: string, options?: Record<string, unknown>): Promise<CliResponse>;
}
```

Create CLI adapters externally (e.g., from `@sourceborn/agent-cli-sdk`) and pass to `workflow.executeCliStep()`.

### Storage Adapters (Pluggable)

Storage adapters extend `BaseStorage`:

```typescript
abstract class BaseStorage {
  constructor(config: BaseStorageConfig);
  abstract getState(): WorkflowStateData;
  abstract setState(updates: Partial<WorkflowStateData>): Promise<void>;
  abstract addFailure(stepName: string, error: Error | string): Promise<void>;
  abstract toJSON(): WorkflowStateData;
  abstract load(): Promise<void>;
}
```

**Current Implementation**: `FileStorage` (filesystem)
**Future Implementations**: Database storage, cloud storage, etc.

## Console Output Conventions

- Use emoji prefixes: 🚀 (starting), ✅ (completed), ❌ (failed), 📋 (workflow ID), 💡 (info)
- Format JSON output with `formatConsoleJson()` for color-coded keys/values
- Use `renderConsoleBox()` for important notifications
- Separate workflow stages with visual line breaks

## Package Publishing

- **Access**: Private npm package
- **Excluded from npm**: Source files, tests, config files, `.agent/`, `.claude/`, `.cursor/`
- **Included**: Only `dist/` directory
- **Pre-publish Hook**: Automatically runs `pnpm build`

## File Extensions

Use `.js` extensions in import statements (Node16+ module resolution), even though files are `.ts`:

```typescript
import { Workflow } from './Workflow.js'; // ✓ Correct
import { Workflow } from './Workflow'; // ✗ Incorrect
```

## Best Practices

### Error Handling Pattern

The library uses the **Result pattern** (`Result<T, E>`) for predictable, type-safe error handling in workflow orchestration methods:

```typescript
import { Workflow, type Result } from '@spectora/agent-workflows';

// Methods that return Result<T, E>
const branchResult = await workflow.ensureBranch('feat/new-feature');
if (!branchResult.ok) {
  console.error('Failed:', branchResult.error);
  return;
}
console.log('Success:', branchResult.data);

const workflowResult = await Workflow.load({ storage });
if (!workflowResult.ok) {
  console.error('Failed to load:', workflowResult.error);
  return;
}
const workflow = workflowResult.data;
```

**When to use Result pattern vs exceptions:**

- **Use Result** (`ok`/`error`) for:

  - Expected workflow outcomes (branch doesn't exist, workflow not found, step failures)
  - Git operations that may fail for business reasons
  - Operations where you want to continue after failure
  - Public API methods where callers should handle errors explicitly
  - All workflow step execution methods (`executeStep`, `executeCliStep`)
  - All factory methods (`Workflow.load`, `FileStorage.load`)
  - Git operations (`ensureBranch`)

- **Use Exceptions** (throw/catch) for:
  - Programmer errors (invalid configuration, null references)
  - Unrecoverable system errors (out of memory, filesystem corruption)
  - Internal helper methods where failure should bubble up
  - Storage I/O operations (caught and wrapped by public APIs)

**Pattern benefits:**

- Type-safe error handling with TypeScript discriminated unions
- Explicit control flow (no hidden exceptions)
- Better observability (errors are values that can be logged/persisted)
- Enables workflow continuation after failures

**Unwrap helpers for fail-fast scenarios:**

When you want to throw immediately on error, use the `unwrap()` family of helpers:

```typescript
import { unwrap, unwrapOr, unwrapOrElse } from '@spectora/agent-workflows';

// unwrap() - throws on error (fail-fast)
const workflow = unwrap(await Workflow.load({ storage }));
// Equivalent to:
// const result = await Workflow.load({ storage });
// if (!result.ok) throw new Error(result.error);
// const workflow = result.data;

// unwrapOr() - returns default value on error
const workflow = unwrapOr(await Workflow.load({ storage }), null);
if (!workflow) {
  console.log('Using fallback...');
}

// unwrapOrElse() - computes default value on error (lazy)
const workflow = unwrapOrElse(await Workflow.load({ storage }), (err) => {
  console.warn('Load failed:', err);
  return createFallbackWorkflow();
});
```

Use `unwrap()` in simple scripts where you want to fail immediately. Use explicit `result.ok` checks in orchestration code where you need fine-grained error handling.

### Module Organization

**Avoid barrel exports** - Do not create `index.ts` files that re-export everything from multiple modules (except types/index.ts). Instead:

❌ **Bad** (barrel export):

```typescript
// utils/index.ts
export * from './logger.js';
export * from './formatters.js';
export * from './validators.js';
```

✅ **Good** (explicit imports):

```typescript
// Import directly from the module
import { logger } from './utils/logger.js';
import { formatConsoleJson } from './utils/formatConsoleJson.js';
```

**Why avoid barrel exports:**

- Harder to track dependencies and circular imports
- Can cause tree-shaking issues (larger bundle sizes)
- Makes refactoring more difficult
- Hides the true source of imports

**Exception:** The main `src/index.ts` file is acceptable as the public API entry point for the package, as it defines the explicit public interface.

## Migration Notes

**Breaking Change**: The library has been refactored to use a clean adapter-based API. The old `WorkflowState`, standalone `executeStep()`, and `executeCliStep()` functions have been removed.

**New Pattern**:

- Create workflows: `new Workflow({ adapter })`
- Execute steps: `workflow.executeStep(name, { fn })`
- Execute CLI steps: `workflow.executeCliStep(name, { cli, prompt, cliOptions })`
- Step numbers auto-increment: Access via `workflow.currentStepNumber`

All functionality is now accessed through the `Workflow` class with config-based method calls.
