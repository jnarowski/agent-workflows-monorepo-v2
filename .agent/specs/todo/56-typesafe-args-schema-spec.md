# Type-Safe Args Schema for Workflows

**Status**: draft
**Created**: 2025-11-06
**Package**: workflow-sdk, apps/web
**Estimated Effort**: 4-6 hours

## Overview

Add JSON Schema-based `argsSchema` field to workflow definitions with full TypeScript type inference and runtime validation. Users define workflow arguments using JSON Schema, and TypeScript automatically infers types for `event.data.args` without requiring `as const` annotations. Runtime validation prevents invalid arguments from reaching workflow execution.

## User Story

As a workflow developer
I want to define typed arguments for my workflows using JSON Schema
So that I get autocomplete, type safety, and runtime validation without manual type casting

## Technical Approach

Use `json-schema-to-ts` library to infer TypeScript types from JSON Schema at compile time. Capture the entire workflow config as const in `defineWorkflow` to enable automatic type inference without requiring users to add `as const`. Add Ajv-based runtime validation in apps/web before sending events to Inngest.

## Key Design Decisions

1. **JSON Schema over Zod**: Keeps schema definition language-agnostic, matches existing frontend expectations, and avoids additional runtime dependencies in workflow-sdk
2. **Const capture in defineWorkflow**: Makes `const TConfig` the primary generic parameter to capture argsSchema automatically, eliminating need for `as const` annotations
3. **Server-side validation only**: Validate once at workflow trigger point (apps/web) rather than on every execution to minimize overhead

## Architecture

### File Structure

```
packages/workflow-sdk/
├── src/
│   ├── types/
│   │   └── workflow.ts          # Add TArgsSchema generic to WorkflowConfig, WorkflowEventData
│   ├── builder/
│   │   └── defineWorkflow.ts    # Update signature to capture config as const
│   └── runtime/
│       └── inngest.ts           # Thread TArgsSchema through InngestEvent
└── package.json                  # Add json-schema-to-ts devDependency

apps/web/
├── src/
│   └── server/
│       └── domain/
│           └── workflow/
│               └── services/
│                   └── workflow/
│                       └── executeWorkflow.ts  # Add Ajv validation
└── package.json                  # Add ajv dependency
```

### Integration Points

**workflow-sdk**:
- `src/types/workflow.ts` - Add TArgsSchema generic, import FromSchema type
- `src/builder/defineWorkflow.ts` - Capture config as const, infer argsSchema type
- `src/runtime/inngest.ts` - Thread TArgsSchema through to InngestEvent type

**apps/web**:
- `src/server/domain/workflow/services/workflow/executeWorkflow.ts` - Add Ajv validation before Inngest send
- `package.json` - Add ajv dependency

## Implementation Details

### 1. Type Inference Layer (workflow-sdk)

Add `json-schema-to-ts` support to enable compile-time type inference from JSON Schema.

**Key Points**:
- Use `FromSchema<T>` to convert JSON Schema type to TypeScript type
- Make `TArgsSchema` default to `JSONSchema` for backward compatibility
- Extract argsSchema from captured config using conditional type inference

### 2. Config Capture Pattern

Update `defineWorkflow` to capture entire config as const, matching how phases currently work.

**Key Points**:
- Primary generic: `const TConfig extends WorkflowConfig`
- Derived generics: Extract `TPhases` and `TArgsSchema` from `TConfig`
- No `as const` required from users - handled automatically

### 3. Runtime Validation (apps/web)

Add Ajv-based JSON Schema validation at workflow execution trigger point.

**Key Points**:
- Compile schema once per workflow definition (can cache)
- Throw validation error with detailed message if args invalid
- Only validate if `workflowDefinition.args_schema` exists (optional feature)

## Files to Create/Modify

### New Files (0)

No new files required.

### Modified Files (4)

1. `packages/workflow-sdk/package.json` - Add `json-schema-to-ts` devDependency
2. `packages/workflow-sdk/src/types/workflow.ts` - Add TArgsSchema generic, update WorkflowConfig and WorkflowEventData
3. `packages/workflow-sdk/src/builder/defineWorkflow.ts` - Update signature to capture config as const
4. `apps/web/src/server/domain/workflow/services/workflow/executeWorkflow.ts` - Add Ajv validation logic

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Add Type Inference to workflow-sdk

<!-- prettier-ignore -->
- [ ] ts-args-1.1 Install json-schema-to-ts as devDependency
  - Run: `cd packages/workflow-sdk && pnpm add -D json-schema-to-ts`
  - Verify: Check package.json has `"json-schema-to-ts": "^3.0.0"` in devDependencies
- [ ] ts-args-1.2 Import JSONSchema and FromSchema types in workflow.ts
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Add import at top: `import type { JSONSchema, FromSchema } from 'json-schema-to-ts';`
- [ ] ts-args-1.3 Add TArgsSchema generic to WorkflowConfig interface
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Change signature to: `export interface WorkflowConfig<TPhases extends readonly PhaseDefinition[] | undefined = undefined, TArgsSchema extends JSONSchema = JSONSchema>`
  - Add field: `argsSchema?: TArgsSchema;`
- [ ] ts-args-1.4 Update WorkflowEventData to infer args type from schema
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Change signature to: `export interface WorkflowEventData<TArgsSchema extends JSONSchema = JSONSchema>`
  - Change args field to: `args: TArgsSchema extends JSONSchema ? FromSchema<TArgsSchema> : Record<string, unknown>;`
- [ ] ts-args-1.5 Thread TArgsSchema through WorkflowFunction type
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Add TArgsSchema generic: `export type WorkflowFunction<TPhases extends readonly PhaseDefinition[] | undefined = undefined, TArgsSchema extends JSONSchema = JSONSchema>`
  - Update event parameter type: `event: InngestEvent<WorkflowEventData<TArgsSchema>>`
- [ ] ts-args-1.6 Thread TArgsSchema through WorkflowDefinition type
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Add TArgsSchema generic: `export interface WorkflowDefinition<TPhases extends readonly PhaseDefinition[] | undefined = undefined, TArgsSchema extends JSONSchema = JSONSchema>`
  - Update config field: `config: WorkflowConfig<TPhases, TArgsSchema>`
  - Update fn field: `fn: WorkflowFunction<TPhases, TArgsSchema>`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: Update defineWorkflow Signature

<!-- prettier-ignore -->
- [ ] ts-args-2.1 Update defineWorkflow to capture config as const
  - File: `packages/workflow-sdk/src/builder/defineWorkflow.ts`
  - Change signature to:
    ```typescript
    export function defineWorkflow<
      const TConfig extends WorkflowConfig,
      TPhases extends readonly PhaseDefinition[] | undefined = TConfig['phases'],
      TArgsSchema extends JSONSchema = TConfig extends { argsSchema: infer S extends JSONSchema } ? S : JSONSchema
    >(
      config: TConfig,
      fn: WorkflowFunction<TPhases, TArgsSchema>
    ): WorkflowDefinition<TPhases, TArgsSchema>
    ```
  - Update return statement to preserve generic types
- [ ] ts-args-2.2 Verify type inference works without as const
  - Create test workflow with argsSchema (no `as const`)
  - Verify `event.data.args` properties are typed correctly
  - Verify enum values become literal unions

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 3: Add Runtime Validation to apps/web

<!-- prettier-ignore -->
- [ ] ts-args-3.1 Install Ajv dependency
  - Run: `cd apps/web && pnpm add ajv`
  - Verify: Check package.json has `"ajv": "^8.0.0"` in dependencies
- [ ] ts-args-3.2 Add Ajv validation in executeWorkflow service
  - File: `apps/web/src/server/domain/workflow/services/workflow/executeWorkflow.ts`
  - Import Ajv: `import Ajv from 'ajv';`
  - Create Ajv instance at module level: `const ajv = new Ajv();`
  - Add validation before Inngest send:
    ```typescript
    if (workflowDefinition.args_schema) {
      const validate = ajv.compile(workflowDefinition.args_schema);
      const valid = validate(execution.args);
      if (!valid) {
        throw new Error(`Invalid workflow args: ${JSON.stringify(validate.errors)}`);
      }
    }
    ```
- [ ] ts-args-3.3 Add error handling for validation failures
  - File: `apps/web/src/server/domain/workflow/services/workflow/executeWorkflow.ts`
  - Wrap validation in try-catch
  - Return meaningful error message to API caller
  - Update workflow execution status to 'failed' if validation fails

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 4: Build and Type Check

<!-- prettier-ignore -->
- [ ] ts-args-4.1 Build workflow-sdk package
  - Run: `cd packages/workflow-sdk && pnpm build`
  - Expected: Clean build with no TypeScript errors
- [ ] ts-args-4.2 Type check apps/web
  - Run: `cd apps/web && pnpm check-types`
  - Expected: No type errors
- [ ] ts-args-4.3 Build entire monorepo
  - Run: `pnpm build` (from root)
  - Expected: All packages build successfully

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

**`packages/workflow-sdk/src/builder/defineWorkflow.test.ts`** - Type inference tests:

```typescript
import { defineWorkflow } from './defineWorkflow';
import { expectType } from 'tsd';

describe('defineWorkflow argsSchema type inference', () => {
  it('should infer string type from JSON Schema', () => {
    const workflow = defineWorkflow({
      id: 'test',
      trigger: 'workflow/test',
      argsSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    }, async ({ event }) => {
      expectType<string | undefined>(event.data.args.name);
    });
  });

  it('should infer enum as literal union', () => {
    const workflow = defineWorkflow({
      id: 'test',
      trigger: 'workflow/test',
      argsSchema: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['high', 'medium', 'low'] }
        }
      }
    }, async ({ event }) => {
      expectType<'high' | 'medium' | 'low' | undefined>(event.data.args.priority);
    });
  });

  it('should handle required fields', () => {
    const workflow = defineWorkflow({
      id: 'test',
      trigger: 'workflow/test',
      argsSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      }
    }, async ({ event }) => {
      expectType<string>(event.data.args.name); // Not undefined
    });
  });
});
```

### Integration Tests

**Runtime validation in apps/web**: Create integration test that verifies Ajv validation rejects invalid args before workflow execution.

### E2E Tests

**Full workflow execution with typed args**: Create example workflow with argsSchema, trigger via API with valid/invalid args, verify validation behavior.

## Success Criteria

- [ ] Developers can define `argsSchema` in workflow config using JSON Schema
- [ ] TypeScript infers types for `event.data.args` automatically (no `as const` needed)
- [ ] Autocomplete works for args properties in workflow function
- [ ] Enum values become literal type unions
- [ ] Required fields are non-optional, optional fields are `T | undefined`
- [ ] Runtime validation rejects invalid args with clear error messages
- [ ] Backward compatibility: workflows without `argsSchema` still work with `Record<string, unknown>`
- [ ] All tests pass (build, type-check, unit tests)
- [ ] No breaking changes to existing workflows

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build workflow-sdk
cd packages/workflow-sdk && pnpm build
# Expected: Clean build, no errors

# Type check workflow-sdk
cd packages/workflow-sdk && pnpm check-types
# Expected: No type errors

# Build apps/web
cd apps/web && pnpm build
# Expected: Clean build, no errors

# Type check apps/web
cd apps/web && pnpm check-types
# Expected: No type errors

# Lint all packages
pnpm lint
# Expected: No lint errors

# Unit tests (if added)
cd packages/workflow-sdk && pnpm test
# Expected: All tests pass
```

**Manual Verification:**

1. Create test workflow with argsSchema:
   ```typescript
   defineWorkflow({
     id: 'test',
     trigger: 'workflow/test',
     argsSchema: {
       type: 'object',
       properties: {
         featureName: { type: 'string' },
         priority: { type: 'string', enum: ['high', 'medium', 'low'] }
       },
       required: ['featureName']
     }
   }, async ({ event }) => {
     // Verify autocomplete works for event.data.args
     const { featureName, priority } = event.data.args;
   });
   ```

2. Verify in IDE:
   - Hover over `featureName` - should show type `string`
   - Hover over `priority` - should show type `'high' | 'medium' | 'low' | undefined`
   - Try accessing non-existent property - should show TypeScript error

3. Test runtime validation:
   - Start apps/web: `cd apps/web && pnpm dev`
   - Trigger workflow via API with invalid args
   - Verify error response with validation details

**Feature-Specific Checks:**

- Verify no `as const` needed for type inference to work
- Verify phases still infer correctly (no regression)
- Verify backward compat: workflow without argsSchema compiles
- Verify runtime validation only runs if args_schema exists

## Implementation Notes

### 1. Type Inference Complexity

The `json-schema-to-ts` library uses advanced TypeScript features (template literal types, conditional types) which can slow down compilation for very complex schemas. For most workflow use cases this should not be noticeable, but be aware if schemas become deeply nested.

### 2. JSONSchema Type Constraint

The `JSONSchema` type from `json-schema-to-ts` is strict and may not accept all valid JSON Schema features. If users report issues with specific schema patterns, we may need to use a more permissive type or add escape hatches.

### 3. Ajv Performance

Ajv compilation is fast but not free. For high-throughput workflows, consider caching compiled validators keyed by workflow_definition.id to avoid recompiling on every execution.

## Dependencies

- `json-schema-to-ts@^3.0.0` (devDependency, workflow-sdk) - Type inference from JSON Schema
- `ajv@^8.0.0` (dependency, apps/web) - Runtime JSON Schema validation
- No additional dependencies required

## Timeline

| Task                          | Estimated Time |
|-------------------------------|----------------|
| Type inference layer          | 1.5 hours      |
| defineWorkflow signature      | 0.5 hours      |
| Runtime validation            | 1 hour         |
| Build and verification        | 0.5 hours      |
| Testing and documentation     | 1 hour         |
| **Total**                     | **4-5 hours**  |

## References

- `json-schema-to-ts` docs: https://github.com/ThomasAribart/json-schema-to-ts
- Ajv documentation: https://ajv.js.org/
- TypeScript const type parameters: https://www.typescriptlang.org/docs/handbook/2/objects.html#const-type-parameters
- Existing phase inference pattern: `packages/workflow-sdk/src/types/workflow.ts` (ExtractPhaseIds type)

## Next Steps

1. Install `json-schema-to-ts` in workflow-sdk
2. Update type definitions to add TArgsSchema generic
3. Update defineWorkflow signature to capture config as const
4. Add Ajv validation in executeWorkflow service
5. Build and verify type inference works
6. Test with example workflow
7. Update CLAUDE.md with argsSchema documentation
