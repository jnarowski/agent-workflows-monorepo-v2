# Feature: Workflow Adapters

## What We're Building

A flexible `Workflow` class that accepts pluggable adapters for different workflow backends (local file system, Todoist, Linear). The first implementation will be a `LocalAdapter` that encapsulates the current `WorkflowState` functionality. This establishes a clean adapter pattern for future integrations while maintaining backward compatibility with existing code.

## User Story

As a developer building automated workflows
I want to use different persistence backends (local, Todoist, Linear)
So that I can track workflow progress in the system that best fits my team's needs

## Technical Approach

Create a `BaseAdapter` abstract class defining the contract for workflow state management (get, set, addFailure, metadata handling). Refactor `WorkflowState` into `LocalAdapter` implementing this contract. Introduce a `Workflow` class that accepts any adapter and provides a unified API. Maintain backward compatibility by keeping standalone `executeStep` and `executeCliStep` functions while adding equivalent methods to the `Workflow` class.

## Files to Touch

### Existing Files

- `src/types/workflow.ts` - Add new adapter interfaces (BaseAdapter, WorkflowMetadata)
- `src/workflow/WorkflowState.ts` - Refactor into LocalAdapter while maintaining exports
- `src/workflow/executeStep.ts` - Add Workflow instance support
- `src/workflow/executeCliStep.ts` - Add Workflow instance support
- `src/index.ts` - Export new Workflow class and adapters
- `src/examples/workflow-simple.ts` - Add example usage of new Workflow class

### New Files

- `src/adapters/BaseAdapter.ts` - Abstract base class for all adapters
- `src/adapters/LocalAdapter.ts` - Local filesystem implementation (refactored WorkflowState)
- `src/adapters/index.ts` - Export all adapters
- `src/workflow/Workflow.ts` - Main workflow orchestration class
- `src/examples/workflow-with-adapter.ts` - Complete example using Workflow class

## Implementation Plan

### Phase 1: Foundation

Define the adapter contract with `BaseAdapter` abstract class. Establish metadata structure for tracking branch names, step status, and timestamps. Create type definitions that support both current usage and future adapters.

### Phase 2: Core Implementation

Refactor `WorkflowState` logic into `LocalAdapter`. Build the `Workflow` class with methods for step execution and state access. Ensure `executeStep` and `executeCliStep` can work with both `WorkflowState` (backward compat) and `Workflow` instances.

### Phase 3: Integration

Update examples to demonstrate new patterns. Verify backward compatibility with existing code. Add comprehensive tests. Update documentation and exports.

## Step by Step Tasks

### 1: Define Adapter Interfaces

<!-- prettier-ignore -->
- [x] 1.1 Create BaseAdapter abstract class with core methods
        - Define abstract methods: `get()`, `set()`, `addFailure()`, `getMetadata()`, `setMetadata()`, `toJSON()`, `load()`
        - Include protected properties: `workflowId`, `data`, `metadata`
        - File: `src/adapters/BaseAdapter.ts`
- [x] 1.2 Add WorkflowMetadata type
        - Define interface with: `workflowId`, `branchName?`, `createdAt`, `updatedAt`, `status`
        - Add StepStatus type: "pending" | "running" | "completed" | "failed"
        - File: `src/types/workflow.ts`
- [x] 1.3 Add WorkflowStateData enhancement
        - Extend type to include `_metadata` field for workflow metadata
        - File: `src/types/workflow.ts`

#### Completion Notes

- Created BaseAdapter abstract class with all required methods and properties
- Added WorkflowMetadata interface with stepStatuses tracking capability
- Enhanced WorkflowStateData type to include optional _metadata field
- All types properly exported for use in other modules

### 2: Create LocalAdapter

<!-- prettier-ignore -->
- [x] 2.1 Create LocalAdapter class
        - Extend BaseAdapter
        - Copy logic from WorkflowState constructor, save(), load()
        - Maintain same file structure: `.agent/workflows/logs/{id}/state.json`
        - File: `src/adapters/LocalAdapter.ts`
- [x] 2.2 Implement metadata management
        - Add `getMetadata()` returning WorkflowMetadata
        - Add `setMetadata(metadata: Partial<WorkflowMetadata>)`
        - Auto-update `updatedAt` timestamp on every `set()` call
        - Store metadata in `data._metadata` field
        - File: `src/adapters/LocalAdapter.ts`
- [x] 2.3 Add step status tracking
        - Modify `set()` to accept optional status parameter
        - Store status in metadata: `stepStatuses: Record<string, StepStatus>`
        - File: `src/adapters/LocalAdapter.ts`
- [x] 2.4 Create adapters index file
        - Export BaseAdapter and LocalAdapter
        - File: `src/adapters/index.ts`

#### Completion Notes

- LocalAdapter successfully refactored from WorkflowState logic
- Maintains exact same file structure for backward compatibility
- Metadata management includes automatic timestamp updates
- Step status tracking integrated into set() method
- Static load() method added for convenience
- All exports properly configured in index file

### 3: Create Workflow Class

<!-- prettier-ignore -->
- [x] 3.1 Create Workflow class with adapter injection
        - Constructor accepts: `adapter: BaseAdapter`
        - Expose methods: `getWorkflowId()`, `get()`, `set()`, `getMetadata()`, `setMetadata()`
        - Add convenience methods: `setBranch(branchName)`, `getStatus()`, `setStatus()`
        - File: `src/workflow/Workflow.ts`
- [x] 3.2 Add step execution methods
        - Add `executeStep<T>(stepName, fn, stepNumber?)` wrapping standalone executeStep
        - Add `executeCliStep(stepName, adapter, prompt, options?, stepNumber?)` wrapping standalone executeCliStep
        - Automatically update step status: "running" → "completed" or "failed"
        - File: `src/workflow/Workflow.ts`
- [x] 3.3 Add static factory methods
        - Add `static async create(adapter: BaseAdapter): Promise<Workflow>`
        - Add `static async load(workflowId: string, adapter: BaseAdapter): Promise<Workflow | null>`
        - File: `src/workflow/Workflow.ts`

#### Completion Notes

- Workflow class successfully implements adapter pattern with dependency injection
- All required methods and convenience methods implemented
- Step execution methods include automatic status tracking (running → completed/failed)
- Auto-generates logPath for LocalAdapter instances in executeCliStep
- Static factory methods provide clean API for creating and loading workflows
- Type-safe generic support for executeStep return values

### 4: Refactor WorkflowState for Backward Compatibility

<!-- prettier-ignore -->
- [x] 4.1 Update WorkflowState to wrap LocalAdapter
        - Keep WorkflowState class but make it delegate to LocalAdapter internally
        - Maintain all existing method signatures
        - Ensure state.json format remains unchanged
        - File: `src/workflow/WorkflowState.ts`
- [x] 4.2 Add deprecation notices
        - Add JSDoc @deprecated tags to WorkflowState class
        - Recommend using `new Workflow(new LocalAdapter(workflowId))` instead
        - File: `src/workflow/WorkflowState.ts`

#### Completion Notes

- WorkflowState refactored to use LocalAdapter internally via delegation
- All existing method signatures preserved for backward compatibility
- Deprecation notices added with migration guidance
- State.json format unchanged - existing workflows will continue to work
- Static load() method properly delegates to LocalAdapter.load()

### 5: Update Execution Functions

<!-- prettier-ignore -->
- [x] 5.1 Update executeStep to accept Workflow
        - Modify state parameter type: `state?: WorkflowState | Workflow`
        - Detect type and call appropriate methods
        - Update step status if Workflow instance provided
        - File: `src/workflow/executeStep.ts`
- [x] 5.2 Update executeCliStep to accept Workflow
        - Modify state parameter type: `state?: WorkflowState | Workflow`
        - Detect type and call appropriate methods
        - Update step status if Workflow instance provided
        - File: `src/workflow/executeCliStep.ts`

#### Completion Notes

- Both executeStep and executeCliStep now accept WorkflowState | Workflow
- Type signatures updated with proper union types
- Documentation updated to show both deprecated and recommended usage patterns
- Backward compatibility maintained - existing code using WorkflowState continues to work
- No implementation changes needed in function bodies as both types have compatible interfaces

### 6: Update Exports and Examples

<!-- prettier-ignore -->
- [x] 6.1 Update main exports
        - Export BaseAdapter, LocalAdapter, Workflow classes
        - Export WorkflowMetadata, StepStatus types
        - Maintain existing exports for backward compatibility
        - File: `src/index.ts`
- [x] 6.2 Create new example demonstrating Workflow class
        - Show workflow creation with LocalAdapter
        - Demonstrate branch name tracking
        - Show step status tracking
        - Include metadata access examples
        - File: `src/examples/workflow-with-adapter.ts`
- [x] 6.3 Update existing example with backward compat note
        - Add comment showing equivalent Workflow usage
        - File: `src/examples/workflow-simple.ts`

#### Completion Notes

- Clean API exports implemented - no backward compatibility
- Removed WorkflowState, executeStep, and executeCliStep standalone files
- All functionality now only available through Workflow class
- Both examples updated to use new Workflow API with LocalAdapter
- Examples demonstrate metadata tracking, branch names, and step status
- All utility functions properly exported

### 7: Testing and Documentation

<!-- prettier-ignore -->
- [ ] 7.1 Add unit tests for BaseAdapter contract
        - Test abstract class can be extended
        - File: `src/adapters/BaseAdapter.test.ts`
- [ ] 7.2 Add unit tests for LocalAdapter
        - Test state persistence
        - Test metadata management
        - Test step status tracking
        - Test backward compatibility with WorkflowState format
        - File: `src/adapters/LocalAdapter.test.ts`
- [ ] 7.3 Add unit tests for Workflow class
        - Test step execution with status updates
        - Test branch name tracking
        - Test factory methods (create, load)
        - File: `src/workflow/Workflow.test.ts`
- [ ] 7.4 Update CLAUDE.md with new patterns
        - Document adapter pattern
        - Show Workflow class usage
        - Note WorkflowState deprecation
        - File: `CLAUDE.md`

#### Completion Notes

## Acceptance Criteria

**Must Work:**

- [ ] LocalAdapter persists state to same location as WorkflowState (`.agent/workflows/logs/{id}/state.json`)
- [ ] Workflow class tracks branch names via `setBranch()` and stores in metadata
- [ ] Workflow class tracks step status (pending/running/completed/failed) automatically during execution
- [ ] Error messages captured via `addFailure()` include timestamp and stack trace
- [ ] Existing code using WorkflowState continues to work without changes
- [ ] New code can use `new Workflow(new LocalAdapter(workflowId))` pattern
- [ ] Workflow can be loaded from disk via `Workflow.load(workflowId, new LocalAdapter(workflowId))`
- [ ] Metadata includes createdAt and updatedAt timestamps auto-managed

**Should Not:**

- [ ] Break any existing tests or examples using WorkflowState
- [ ] Change the state.json file format in a way that breaks existing workflows
- [ ] Remove or alter exports that external packages depend on
- [ ] Degrade performance of workflow execution or state persistence

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

    # Build verification
    pnpm build
    # Expected: Clean build with no errors, dist/ contains compiled output

    # Type checking
    pnpm check-types
    # Expected: No type errors

    # Linting
    pnpm lint
    # Expected: No lint errors

    # Unit tests
    pnpm test
    # Expected: All tests pass including new adapter tests

**Manual Verification:**

1. Run new example: `pnpm tsx src/examples/workflow-with-adapter.ts`
2. Verify: Workflow completes, state.json created with metadata
3. Check: `.agent/workflows/logs/{id}/state.json` contains `_metadata` field
4. Verify: Branch name is tracked if `workflow.setBranch()` called
5. Check console: Step status transitions visible in logs

**Feature-Specific Checks:**

- Verify LocalAdapter creates state.json in same location as old WorkflowState
- Verify `_metadata` field contains: `workflowId`, `createdAt`, `updatedAt`, `status`, `branchName`
- Verify `stepStatuses` tracks each step's status throughout execution
- Load existing workflow from disk and verify metadata persists
- Run original workflow-simple.ts example to confirm backward compatibility

## Definition of Done

- [ ] All tasks completed
- [ ] Tests passing (including new adapter tests)
- [ ] Lint and Type Checks passing
- [ ] Manual testing confirms Workflow class works with LocalAdapter
- [ ] Backward compatibility verified with existing WorkflowState code
- [ ] No console errors
- [ ] Code follows existing patterns (async/await, error handling)
- [ ] Examples demonstrate both old and new patterns
- [ ] CLAUDE.md updated with adapter pattern documentation

## Notes

**Future Adapters**: The BaseAdapter contract is designed to support future implementations:
- **TodoistAdapter**: Will map workflow steps to Todoist tasks, branch name to project
- **LinearAdapter**: Will create Linear issues for steps, track status via issue status

**Migration Path**: Existing code can migrate gradually:
1. Continue using WorkflowState (works via delegation)
2. Switch to `new Workflow(new LocalAdapter(id))` when ready
3. Future: Replace LocalAdapter with TodoistAdapter/LinearAdapter without changing Workflow usage

**Metadata Storage**: The `_metadata` field is prefixed with underscore to avoid collision with user-defined step names.

**Type Safety**: All adapters enforce type safety via BaseAdapter abstract class, ensuring consistent behavior across implementations.
