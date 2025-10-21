# @spectora/agent-workflows

Agent workflow utilities for building and executing automated workflows with AI agents.

## Overview

This library provides a set of utilities for managing workflow state, executing steps, and working with CLI tools (Claude, Codex, etc.). It's designed to help you build robust, traceable workflows that combine AI-powered steps with custom logic.

## Installation

```bash
pnpm add @spectora/agent-workflows
```

## Key Features

- **Pluggable Storage Adapters**: Swap persistence backends without changing workflow code
- **CLI Integration**: Execute AI-powered steps using Claude or Codex via agent-cli-sdk
- **Automatic Logging**: Built-in console logging with step tracking and agent log persistence
- **Error Handling**: Automatic failure recording and graceful error handling
- **Type-Safe**: Full TypeScript support with config-based APIs

## Core Concepts

### Workflow

The main orchestration class that accepts pluggable storage adapters.

```typescript
import { Workflow, FileStorage, generateWorkflowId } from "@spectora/agent-workflows";

// Generate a human-readable workflow ID with timestamp and feature name
// Format: YYYYMMDDHHMMSS-feature-name (e.g., "20251018143022-user-authentication")
const workflowId = generateWorkflowId("User Authentication");
const workflow = new Workflow({
  storage: new FileStorage({ workflowId })
});

// Set workflow state
await workflow.setState({ branchName: "feat/new-feature", status: "running" });

// Access workflow ID (readonly)
console.log(workflow.id); // "20251018143022-user-authentication"
```

### executeCliStep

Execute a CLI adapter step with automatic logging, state management, and auto-configured logPath. Returns a `Result<CliResponse, string>` for error handling.

```typescript
import { createClaudeAdapter } from "@sourceborn/agent-cli-sdk";
import { unwrap } from "@spectora/agent-workflows";

const claude = createClaudeAdapter();

// Using unwrap for fail-fast behavior (step numbers auto-increment)
const response = unwrap(
  await workflow.executeCliStep("plan", {
    cli: claude,
    prompt: "Create implementation plan",
    cliOptions: {
      model: "sonnet",
      permissionMode: "plan"
    }
  })
);
console.log(workflow.currentStepNumber); // 1
```

### executeStep

Execute a generic function as a workflow step with automatic logging and state management. Returns a `Result<T, string>` for error handling.

```typescript
import { unwrap } from "@spectora/agent-workflows";

// Option 1: Using unwrap for fail-fast behavior
const result = unwrap(
  await workflow.executeStep("analyze", {
    fn: async () => {
      // Your custom logic here
      return {
        analyzed: true,
        findings: ["All systems operational"]
      };
    }
  })
);
console.log(workflow.currentStepNumber); // Auto-incremented

// Option 2: Handling Result explicitly
const result = await workflow.executeStep("analyze", {
  fn: async () => ({ analyzed: true })
});

if (!result.ok) {
  console.error("Step failed:", result.error);
  return;
}
console.log("Success:", result.data);
console.log("Step number:", workflow.currentStepNumber);
```

## Quick Start

```typescript
import { Workflow, FileStorage, generateWorkflowId, unwrap } from "@spectora/agent-workflows";
import { createClaudeAdapter } from "@sourceborn/agent-cli-sdk";

async function main() {
  // Create workflow with storage adapter
  // Generate human-readable ID: "20251018143022-implementation-plan"
  const workflowId = generateWorkflowId("Implementation Plan");
  const workflow = new Workflow({
    storage: new FileStorage({ workflowId })
  });

  // Create Claude CLI adapter
  const claude = createClaudeAdapter();

  // Step 1: AI-powered planning (using unwrap for fail-fast)
  const planResult = unwrap(
    await workflow.executeCliStep("plan", {
      cli: claude,
      prompt: "Create implementation plan",
      cliOptions: { model: "sonnet", permissionMode: "plan" }
    })
  );

  // Step 2: Custom processing (handling Result explicitly)
  const analyzeResult = await workflow.executeStep("analyze", {
    fn: async () => {
      const planData = workflow.getStepState("plan");
      // Custom analysis logic
      return { analyzed: true, planData };
    }
  });

  if (!analyzeResult.ok) {
    console.error("Analysis failed:", analyzeResult.error);
    return;
  }

  // Mark workflow as completed (automatically sets completedAt timestamp)
  await workflow.setState({ status: "completed" });

  // Access workflow state
  const state = workflow.getState();
  console.log("Workflow completed at:", state.completedAt);
  console.log("Full state:", state);
}

main().catch(console.error);
```

## Examples

The `examples/` directory contains working examples:

- **workflow-simple.ts**: Basic workflow with mock CLI adapter
- **workflow-with-adapter.ts**: Advanced example showing state management and branch tracking
- **workflow-claude.ts**: Real-world example using Claude CLI adapter

### Run Examples

```bash
# Simple mock example
bun run examples/workflow-simple.ts

# Example with real Claude CLI (requires authentication)
bun run examples/workflow-claude.ts
```

## Validation

Run all checks (lint, type-check, and tests):

```bash
pnpm check
```

## API Reference

### Workflow

Main orchestration class for workflow execution.

#### Constructor

```typescript
new Workflow(config: WorkflowConfig)
```

#### Properties

- `id: string` - Get the workflow ID (readonly)
- `currentStepNumber: number` - Get the current step number (readonly, auto-increments with each step)

#### Methods

- `getState(): WorkflowStateData` - Get the entire workflow state
- `setState(state: Partial<WorkflowStateData>): Promise<void>` - Set workflow state (partial update)
- `setStepState(stepName: string, stepData: unknown): Promise<void>` - Set state for a specific step
- `getStepState(stepName: string): unknown` - Get state for a specific step
- `executeStep<T>(config: ExecuteStepConfig<T>): Promise<Result<T, string>>` - Execute a generic function as a workflow step (returns Result)
- `executeCliStep(config: ExecuteCliStepConfig): Promise<Result<CliResponse, string>>` - Execute a CLI step with automatic logging (returns Result)
- `ensureBranch(branchName: string): Promise<Result<EnsureBranchResult, string>>` - Ensure git branch exists and is checked out (returns Result)
- `static create(config: WorkflowConfig): Promise<Workflow>` - Create a new workflow
- `static load(config: WorkflowConfig): Promise<Result<Workflow, string>>` - Load an existing workflow from storage (returns Result)

### FileStorage

Filesystem implementation of workflow state persistence.

#### Constructor

```typescript
new FileStorage(config: FileStorageConfig)
```

#### Methods

- `getWorkflowId(): string` - Get the workflow ID
- `getStateDir(): string` - Get the state directory path
- `getState(): WorkflowStateData` - Get the entire workflow state
- `setState(updates: Partial<WorkflowStateData>): Promise<void>` - Set workflow state and save to disk
- `addFailure(stepName: string, error: Error | string): Promise<void>` - Add a failure entry to the workflow state
- `toJSON(): WorkflowStateData` - Returns the workflow state as JSON
- `load(): Promise<void>` - Load workflow state from disk
- `static load(config: FileStorageConfig): Promise<Result<FileStorage, string>>` - Load an existing workflow from disk (returns Result)

### Utilities

- `generateWorkflowId(workflowName: string): string` - Generate a human-readable workflow ID with format `YYYYMMDDHHMMSS-feature-name` (e.g., `"20251018143022-user-authentication"`)
- `formatConsoleJson(obj: unknown): string` - Format JSON with syntax highlighting for console output
- `renderConsoleBox(content: string, options?: RenderBoxOptions): string` - Render content in a formatted console box
- `unwrap<T, E>(result: Result<T, E>): T` - Extract value from Result or throw error (fail-fast)
- `unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T` - Extract value from Result or return default
- `unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T` - Extract value from Result or compute default

## State Persistence

When using `FileStorage`, workflow state is automatically saved to `.agent/workflows/logs/{workflowId}/state.json`.

The state file includes:
- `workflowId` - Unique identifier for the workflow
- `branchName` - Git branch name (optional)
- `createdAt` - ISO timestamp when the workflow was created
- `updatedAt` - ISO timestamp of the last state update
- `completedAt` - ISO timestamp when the workflow was completed (automatically set when status becomes "completed")
- `status` - Current workflow status: "pending" | "running" | "completed" | "failed"
- `currentStepNumber` - Auto-incrementing step counter (starts at 0, increments with each step execution)
- `stepStatuses` - Status of each individual step
- `steps` - Results from each step execution

Agent CLI logs (when using real Claude or Codex adapters) are automatically written to:
- `.agent/workflows/logs/{workflowId}/{stepName}/input.json` - Input prompt and options
- `.agent/workflows/logs/{workflowId}/{stepName}/output.json` - Full adapter response
- `.agent/workflows/logs/{workflowId}/{stepName}/stream.jsonl` - Streaming events (if enabled)

The workflow library automatically configures the `logPath` for agent-cli-sdk, so you don't need to specify it manually.

## Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm check-types

# Run tests
pnpm test

# Watch mode for tests
pnpm test:watch
```

## Requirements

- Node.js >= 22
- TypeScript >= 5.9

## License

MIT

## Author

Spectora
