# Feature: Rename ExecutionResponse Fields for Better API Ergonomics

## What We're Building

Refactoring the `ExecutionResponse` interface to use more intuitive field names: renaming `output` to `data` (the user's result) and `data` to `events` (internal stream events). This makes the API more intuitive since developers naturally expect `response.data` to contain their requested data, not internal telemetry.

## User Story

As a SDK user
I want to access my execution results via `response.data`
So that the API feels natural and matches common conventions from other SDKs

## Technical Approach

This is a straightforward rename operation across the codebase:
1. Update the core `ExecutionResponse` interface definition
2. Update both parser implementations (Claude and Codex) to return the new field names
3. Update all test files to use the new field names
4. Update all example files to use the new field names
5. Update documentation if it exists

The change is purely cosmetic but improves developer experience significantly. No logic changes are required.

## Files to Touch

### Existing Files

**Core Types (3 files)**
- `packages/agent-cli-sdk/src/types/interfaces.ts` - Update ExecutionResponse interface definition
- `packages/agent-cli-sdk/src/types/logging.ts` - Update ExecutionLog interface that references ExecutionResponse
- `packages/agent-cli-sdk/src/types/__type-tests__/events.test-d.ts` - Update type tests (~19 references)

**Parsers (2 files)**
- `packages/agent-cli-sdk/src/adapters/claude/parser.ts` - Update return object in parseStreamOutput()
- `packages/agent-cli-sdk/src/adapters/codex/parser.ts` - Update return object in parseCodexOutput()

**Session Classes (2 files)**
- `packages/agent-cli-sdk/src/client/session.ts` - Update field references if any
- `packages/agent-cli-sdk/src/adapters/claude/session.ts` - Update field references if any

**Unit Tests (3 files)**
- `packages/agent-cli-sdk/tests/unit/adapters/claude/parser.test.ts` - Update all response.output assertions
- `packages/agent-cli-sdk/tests/unit/client/agent-client.test.ts` - Update assertions
- `packages/agent-cli-sdk/tests/unit/client/session.test.ts` - Update assertions

**Integration Tests (2 files)**
- `packages/agent-cli-sdk/tests/integration/session-flows.test.ts` - Update assertions
- `packages/agent-cli-sdk/tests/integration/client-workflows.test.ts` - Update assertions

**E2E Tests (3 files)**
- `packages/agent-cli-sdk/tests/e2e/structured-output.e2e.test.ts` - Update all result.output references
- `packages/agent-cli-sdk/tests/e2e/claude-e2e.test.ts` - Update assertions
- `packages/agent-cli-sdk/tests/e2e/codex-e2e.test.ts` - Update assertions

**Examples (5 files)**
- `packages/agent-cli-sdk/examples/advanced/structured-output.ts` - Update 18+ result.output references
- `packages/agent-cli-sdk/examples/typed-events.ts` - Update response.data casts to response.events
- `packages/agent-cli-sdk/examples/basic/claude.ts` - Update output references
- `packages/agent-cli-sdk/examples/advanced/dynamic-scoping-session.ts` - Update references
- `packages/agent-cli-sdk/examples/advanced/interactive-relay.ts` - Update references

**Documentation (if exists)**
- `packages/agent-cli-sdk/TYPED_EVENTS.md` - Update event handling examples
- `packages/agent-cli-sdk/examples/README.md` - Update example descriptions

### New Files

None - this is a refactoring task only.

## Implementation Plan

### Phase 1: Foundation

Update core type definitions to establish the new interface. This includes:
- Updating the main ExecutionResponse interface in interfaces.ts
- Updating dependent types like ExecutionLog
- Updating all type tests to verify the new structure works correctly

### Phase 2: Core Implementation

Update the implementation layer:
- Modify both parser functions (Claude and Codex) to return objects with the new field names
- Update session classes to use the new field names
- Verify no other internal code references the old field names

### Phase 3: Integration

Update all tests and examples:
- Update all unit tests to assert against the new field names
- Update integration and E2E tests
- Update example files to demonstrate the new API
- Update documentation if it exists

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Update Core Type Definitions

<!-- prettier-ignore -->
- [ ] 1.1 Update ExecutionResponse interface in types/interfaces.ts
        - Change `output: T` to `data: T`
        - Change `data?: StreamEvent[]` to `events?: StreamEvent[]`
        - Update JSDoc comments to reflect new field names
        - File: `packages/agent-cli-sdk/src/types/interfaces.ts`
- [ ] 1.2 Update ExecutionLog interface in types/logging.ts
        - Update the `output` field reference to use ExecutionResponse correctly
        - File: `packages/agent-cli-sdk/src/types/logging.ts`
- [ ] 1.3 Update type tests to use new field names
        - Replace all `response.output` with `response.data` in test scenarios
        - Replace all `response.data as ClaudeStreamEvent[]` with `response.events as ClaudeStreamEvent[]`
        - Update test function names and comments to reflect new terminology
        - File: `packages/agent-cli-sdk/src/types/__type-tests__/events.test-d.ts`
- [ ] 1.4 Run type check to verify no type errors
        - Command: `pnpm check-types`
        - Expected: No type errors (note: some runtime tests may fail until parsers are updated)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 2: Update Parser Implementations

<!-- prettier-ignore -->
- [ ] 2.1 Update Claude parser return statement
        - In parseStreamOutput(), change the return object:
          - `output` → `data`
          - `data: events` → `events`
        - Update any internal variable names for clarity (optional but recommended)
        - File: `packages/agent-cli-sdk/src/adapters/claude/parser.ts` (around line 207-227)
- [ ] 2.2 Update Codex parser return statement
        - In parseCodexOutput(), change the return object:
          - `output` → `data`
          - `data: events` → `events`
        - Update any internal variable names for clarity (optional but recommended)
        - File: `packages/agent-cli-sdk/src/adapters/codex/parser.ts` (around line 62-77)
- [ ] 2.3 Run type check again
        - Command: `pnpm check-types`
        - Expected: No type errors

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 3: Update Session Classes

<!-- prettier-ignore -->
- [ ] 3.1 Search and update references in unified session class
        - Search for any `.output` or `.data` field accesses
        - Update to use `.data` and `.events` respectively
        - File: `packages/agent-cli-sdk/src/client/session.ts`
- [ ] 3.2 Search and update references in Claude session class
        - Search for any `.output` or `.data` field accesses
        - Update to use `.data` and `.events` respectively
        - File: `packages/agent-cli-sdk/src/adapters/claude/session.ts`
- [ ] 3.3 Run type check
        - Command: `pnpm check-types`
        - Expected: No type errors

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 4: Update Unit Tests

<!-- prettier-ignore -->
- [ ] 4.1 Update Claude parser tests
        - Replace all `response.output` with `response.data`
        - Replace all `response.data` (when referring to events) with `response.events`
        - File: `packages/agent-cli-sdk/tests/unit/adapters/claude/parser.test.ts`
- [ ] 4.2 Update agent client tests
        - Replace all `result.output` with `result.data`
        - Replace all `result.data` (when referring to events) with `result.events`
        - File: `packages/agent-cli-sdk/tests/unit/client/agent-client.test.ts`
- [ ] 4.3 Update session tests
        - Replace all `result.output` with `result.data`
        - Replace all `result.data` (when referring to events) with `result.events`
        - File: `packages/agent-cli-sdk/tests/unit/client/session.test.ts`
- [ ] 4.4 Run unit tests
        - Command: `pnpm test`
        - Expected: All unit tests pass

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 5: Update Integration Tests

<!-- prettier-ignore -->
- [ ] 5.1 Update session flow tests
        - Replace all `result.output` with `result.data`
        - Replace all `result.data` (when referring to events) with `result.events`
        - File: `packages/agent-cli-sdk/tests/integration/session-flows.test.ts`
- [ ] 5.2 Update client workflow tests
        - Replace all `result.output` with `result.data`
        - Replace all `result.data` (when referring to events) with `result.events`
        - File: `packages/agent-cli-sdk/tests/integration/client-workflows.test.ts`
- [ ] 5.3 Run all tests
        - Command: `pnpm test`
        - Expected: All tests pass

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 6: Update E2E Tests

<!-- prettier-ignore -->
- [ ] 6.1 Update structured output E2E tests
        - Replace all `result.output` with `result.data` (18+ occurrences expected)
        - Update any comments referring to "output" field
        - File: `packages/agent-cli-sdk/tests/e2e/structured-output.e2e.test.ts`
- [ ] 6.2 Update Claude E2E tests
        - Replace all `result.output` with `result.data`
        - Replace all `result.data` (when referring to events) with `result.events`
        - File: `packages/agent-cli-sdk/tests/e2e/claude-e2e.test.ts`
- [ ] 6.3 Update Codex E2E tests
        - Replace all `result.output` with `result.data`
        - Replace all `result.data` (when referring to events) with `result.events`
        - File: `packages/agent-cli-sdk/tests/e2e/codex-e2e.test.ts`
- [ ] 6.4 Run E2E tests (optional - requires CLI setup)
        - Command: `RUN_E2E_TESTS=true pnpm test:e2e`
        - Expected: All E2E tests pass (if you have Claude CLI configured)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 7: Update Example Files

<!-- prettier-ignore -->
- [ ] 7.1 Update structured output examples
        - Replace all `result.output` with `result.data` (18+ occurrences)
        - Update comments explaining the response structure
        - File: `packages/agent-cli-sdk/examples/advanced/structured-output.ts`
- [ ] 7.2 Update typed events examples
        - Replace `response.data as ClaudeStreamEvent[]` with `response.events as ClaudeStreamEvent[]`
        - Replace `response.data as CodexStreamEvent[]` with `response.events as CodexStreamEvent[]`
        - Update all comments about event handling
        - File: `packages/agent-cli-sdk/examples/typed-events.ts`
- [ ] 7.3 Update basic Claude example
        - Replace all `result.output` references with `result.data`
        - File: `packages/agent-cli-sdk/examples/basic/claude.ts`
- [ ] 7.4 Update dynamic scoping session example
        - Replace all result field references
        - File: `packages/agent-cli-sdk/examples/advanced/dynamic-scoping-session.ts`
- [ ] 7.5 Update interactive relay example
        - Replace all result field references
        - File: `packages/agent-cli-sdk/examples/advanced/interactive-relay.ts`
- [ ] 7.6 Test running an example manually
        - Command: `npx tsx examples/basic/claude.ts` (requires Claude CLI)
        - Expected: Example runs without errors

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 8: Update Documentation

<!-- prettier-ignore -->
- [ ] 8.1 Update TYPED_EVENTS.md if it exists
        - Search for `.output` and `.data` references
        - Update examples to use new field names
        - File: `packages/agent-cli-sdk/TYPED_EVENTS.md`
- [ ] 8.2 Update examples README if it exists
        - Update any code snippets showing response usage
        - File: `packages/agent-cli-sdk/examples/README.md`
- [ ] 8.3 Search for any other documentation files
        - Command: `find packages/agent-cli-sdk -name "*.md" -type f`
        - Manually review and update any that reference the old field names

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 9: Final Verification

<!-- prettier-ignore -->
- [ ] 9.1 Run full check suite
        - Command: `pnpm check`
        - Expected: All tests pass, no type errors, no lint errors
- [ ] 9.2 Run type-specific type tests
        - Command: `pnpm check-types:tests`
        - Expected: Type tests compile successfully
- [ ] 9.3 Build the package
        - Command: `pnpm build`
        - Expected: Build succeeds with no errors
- [ ] 9.4 Search for any remaining old field references
        - Command: `grep -r "response\.output\|result\.output" packages/agent-cli-sdk/src packages/agent-cli-sdk/tests packages/agent-cli-sdk/examples --include="*.ts"`
        - Expected: No results (all should be updated to `.data`)
- [ ] 9.5 Search for old event field references
        - Command: `grep -r "response\.data as.*Event\|result\.data as.*Event" packages/agent-cli-sdk/src packages/agent-cli-sdk/tests packages/agent-cli-sdk/examples --include="*.ts"`
        - Expected: No results (all should be updated to `.events`)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Acceptance Criteria

**Must Work:**

- [ ] `ExecutionResponse<T>` interface has `data: T` field instead of `output: T`
- [ ] `ExecutionResponse` interface has `events?: StreamEvent[]` instead of `data?: StreamEvent[]`
- [ ] All parsers (Claude and Codex) return objects with the new field names
- [ ] All tests use the new field names and pass
- [ ] All examples use the new field names and run without errors
- [ ] Type checking passes with no errors
- [ ] Build completes successfully
- [ ] No console errors when running examples

**Should Not:**

- [ ] Break any existing functionality (this is purely a rename)
- [ ] Leave any references to the old field names
- [ ] Cause any type errors or warnings
- [ ] Affect runtime behavior (only field names change)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: ✓ No type errors

# Type test checking
pnpm check-types:tests
# Expected: ✓ Type tests compile successfully

# Unit and integration tests
pnpm test
# Expected: ✓ All tests pass

# Linting
pnpm lint
# Expected: ✓ No lint errors

# Build verification
pnpm build
# Expected: ✓ Build succeeds

# Full check (combines above)
pnpm check
# Expected: ✓ All checks pass
```

**Manual Verification:**

1. Search for old field references:
   ```bash
   grep -r "\.output\b" packages/agent-cli-sdk/src --include="*.ts" | grep -v "stdout"
   # Expected: No results related to ExecutionResponse.output
   ```

2. Search for old data-as-events pattern:
   ```bash
   grep -r "\.data as.*StreamEvent" packages/agent-cli-sdk/src packages/agent-cli-sdk/tests packages/agent-cli-sdk/examples --include="*.ts"
   # Expected: No results (should all be .events now)
   ```

3. Verify type tests work:
   ```bash
   cat packages/agent-cli-sdk/src/types/__type-tests__/events.test-d.ts | grep "response\.data"
   # Expected: Should see references to response.data containing the actual result
   cat packages/agent-cli-sdk/src/types/__type-tests__/events.test-d.ts | grep "response\.events"
   # Expected: Should see references to response.events containing StreamEvent[]
   ```

4. Run an example (requires Claude CLI setup):
   ```bash
   npx tsx packages/agent-cli-sdk/examples/advanced/structured-output.ts
   # Expected: Examples run successfully, output shows result.data being accessed
   ```

**Feature-Specific Checks:**

- Open `src/types/interfaces.ts` and verify ExecutionResponse has `data: T` and `events?: StreamEvent[]`
- Open `src/adapters/claude/parser.ts` and verify the return statement uses the new field names
- Open `src/adapters/codex/parser.ts` and verify the return statement uses the new field names
- Open any test file and verify assertions use `response.data` for results and `response.events` for stream events
- Open any example file and verify usage of `result.data` for accessing the actual result

## Definition of Done

- [ ] All tasks completed
- [ ] All tests passing (unit, integration, E2E if possible)
- [ ] Type checks pass with no errors
- [ ] Lint checks pass
- [ ] Build succeeds
- [ ] No references to old field names remain
- [ ] Examples updated and verified
- [ ] Documentation updated
- [ ] Manual testing confirms new API works correctly

## Notes

**Breaking Change:**
This is a breaking API change. The package version should be bumped to indicate this (e.g., 3.0.0 → 4.0.0). Users will need to update their code to use the new field names.

**Migration Path for Users:**
Users upgrading will need to:
1. Change all `response.output` to `response.data`
2. Change all `response.data as SomeStreamEvent[]` to `response.events as SomeStreamEvent[]`

**Why This Change:**
The original naming was counterintuitive. Developers expect `.data` to contain the main result of an API call, not internal events. This change aligns with common API design patterns and improves the developer experience.

**No Logic Changes:**
This refactor only changes field names. No business logic, parsing logic, or functionality is altered. The risk is low, but the impact on consumers is high (breaking change).
