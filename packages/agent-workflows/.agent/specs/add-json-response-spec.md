# Generate Response Types from Slash Command JSON Outputs

## Overview

Extend the existing slash command type generation system to automatically generate TypeScript response types from JSON output schemas documented in command files. This enables type-safe parsing of command responses in workflows.

## Context

The codebase already has infrastructure for generating slash command types (`SlashCommandName`, `SlashCommandArgs`, `buildSlashCommand`). This spec extends that system to also generate response types when commands define JSON output formats.

Currently, the `/review-spec-implementation` command documents its JSON response format:

```markdown
If $format is "json", return ONLY this JSON:

```json
{
  "success": true,
  "review_iteration": 2,
  ...
}
```

**JSON Field Descriptions:**
- `success`: Always true if review completed
- `review_iteration`: Current iteration number (1-based, auto-detected)
...
```

We want to automatically generate TypeScript types from this documentation.

## Goals

1. Parse JSON response schemas from slash command documentation
2. Generate TypeScript interfaces with proper types and JSDoc comments
3. Make `executeCliStep` type-safe with generic response types
4. Provide convenient JSON parsing with type validation
5. Maintain backward compatibility with existing code

## Non-Goals

- Runtime validation of JSON responses (just TypeScript types)
- Changing the format of existing command documentation
- Supporting non-JSON response formats

## Implementation Plan

### Phase 1: Extend Command Parsing

**File:** `src/utils/parseSlashCommands.ts`

Add JSON response schema parsing:

```typescript
// Add to CommandDefinition type
interface ResponseSchema {
  exampleJson: Record<string, unknown>;
  fieldDescriptions: Map<string, string>;
}

// New parsing function
function parseJsonResponseSchema(content: string): ResponseSchema | undefined {
  // 1. Look for pattern: "If $format is \"json\", return ONLY this JSON:"
  // 2. Extract the next code block (```json ... ```)
  // 3. Parse JSON to get structure
  // 4. Find field descriptions section (starts with "**JSON Field Descriptions:**")
  // 5. Parse bullet list: "- `field`: description"
  // 6. Return { exampleJson, fieldDescriptions }
}

// Update parseSlashCommands to call parseJsonResponseSchema
export async function parseSlashCommands(commandsDir: string): Promise<CommandDefinition[]> {
  // ... existing code ...
  const { data, content } = matter(fileContent);

  // NEW: Parse response schema if present
  const responseSchema = parseJsonResponseSchema(content);

  return {
    name: commandName,
    description: data.description || "",
    arguments: args,
    responseSchema, // Add to result
  };
}
```

**Acceptance Criteria:**
- Correctly extracts JSON from code blocks
- Parses field descriptions into Map
- Returns undefined if no JSON schema found
- Handles nested objects in JSON

### Phase 2: Response Type Generation

**File:** `src/utils/generateCommandResponseTypes.ts` (new)

Generate TypeScript interfaces from parsed schemas:

```typescript
export function generateResponseTypeCode(
  commandName: string,
  schema: ResponseSchema
): string {
  // 1. Convert command name to PascalCase + "Result" suffix
  //    "/review-spec-implementation" → "ReviewSpecImplementationResult"

  // 2. Recursively convert JSON structure to TypeScript interface
  //    - string → string
  //    - number → number
  //    - boolean → boolean
  //    - object → nested interface or inline type
  //    - array → T[]

  // 3. Add JSDoc comments from fieldDescriptions

  // 4. Return generated interface string
}

// Example output:
/*
export interface ReviewSpecImplementationResult {
  /** Always true if review completed *\/
  success: boolean;
  /** Current iteration number (1-based, auto-detected) *\/
  review_iteration: number;
  max_iterations: number;
  priority_breakdown: {
    high: number;
    medium: number;
  };
  next_steps: {
    has_issues: boolean;
    implement_command: string;
    review_command: string;
  };
}
*/
```

**Acceptance Criteria:**
- Generates valid TypeScript interfaces
- Includes JSDoc comments for documented fields
- Handles nested objects correctly
- Uses proper naming convention (PascalCase + "Result")

### Phase 3: Update Type Generation Output

**File:** `src/utils/generateSlashCommandTypes.ts`

Extend the generated output to include response types:

```typescript
export function generateSlashCommandTypesCode(
  commands: CommandDefinition[]
): string {
  // ... existing code for SlashCommandName and SlashCommandArgs ...

  // NEW: Generate response type interfaces
  const responseTypes = commands
    .filter(cmd => cmd.responseSchema)
    .map(cmd => generateResponseTypeCode(cmd.name, cmd.responseSchema!))
    .join('\n\n');

  // NEW: Generate SlashCommandResponses mapping
  const responsesMapping = commands
    .filter(cmd => cmd.responseSchema)
    .map(cmd => {
      const typeName = commandNameToTypeName(cmd.name);
      return `  "${cmd.name}": ${typeName};`;
    })
    .join('\n');

  const responsesInterface = responsesMapping
    ? `export interface SlashCommandResponses {\n${responsesMapping}\n}`
    : '';

  return `// ... existing output ...

${responseTypes}

${responsesInterface}
`;
}
```

**Acceptance Criteria:**
- Backward compatible (doesn't break existing types)
- Only generates response types for commands with schemas
- Creates SlashCommandResponses mapping interface
- Maintains existing formatting and style

### Phase 4: Make Workflow Methods Generic

**File:** `src/types/workflow.ts`

Update type definitions:

```typescript
// Make CliResponse generic
export interface CliResponse<T = unknown> {
  success: boolean;
  output: string;
  data?: T; // Optional parsed data
}
```

**File:** `src/workflow/Workflow.ts`

Add generic type parameter to `executeCliStep`:

```typescript
async executeCliStep<TResponse = unknown>(
  config: ExecuteCliStepConfig
): Promise<Result<CliResponse<TResponse>, string>> {
  // Existing implementation unchanged
  // The generic just provides type information for consumers
}

// NEW: Add convenience method for JSON parsing
async executeCliStepJson<TResponse>(
  config: ExecuteCliStepConfig
): Promise<Result<TResponse, string>> {
  const result = await this.executeCliStep<TResponse>(config);
  if (!result.ok) return result;

  try {
    const parsed = JSON.parse(result.data.output) as TResponse;
    return { ok: true, data: parsed };
  } catch (error) {
    return { ok: false, error: `Failed to parse JSON: ${error}` };
  }
}
```

**Acceptance Criteria:**
- Backward compatible (existing code works without changes)
- Generic type defaults to `unknown`
- `executeCliStepJson` returns parsed data directly
- Proper error handling for invalid JSON

### Phase 5: Update Example Workflow

**File:** `.agent/workflows/plan-implement-review-push.ts`

Demonstrate type-safe usage:

```typescript
import type { ReviewSpecImplementationResult } from '../types/slash-commands.js';

// Option 1: Manual parsing with type annotation
const reviewResult = unwrap(
  await workflow.executeCliStep<ReviewSpecImplementationResult>({
    cli: claude,
    name: 'review',
    prompt: buildSlashCommand('/review-spec-implementation', {
      'spec-file-path': `.agent/specs/${featureName}-spec.md`,
      format: 'json',
    }),
    stepNumber: 4,
  })
);

const review = JSON.parse(reviewResult.output) as ReviewSpecImplementationResult;
console.log(`Found ${review.issues_found} issues`);
console.log(`High: ${review.priority_breakdown.high}, Medium: ${review.priority_breakdown.medium}`);

// Option 2: Using convenience method
const reviewData = unwrap(
  await workflow.executeCliStepJson<ReviewSpecImplementationResult>({
    cli: claude,
    name: 'review',
    prompt: buildSlashCommand('/review-spec-implementation', {
      'spec-file-path': `.agent/specs/${featureName}-spec.md`,
      format: 'json',
    }),
    stepNumber: 4,
  })
);

// reviewData is already parsed as ReviewSpecImplementationResult
console.log(`Found ${reviewData.issues_found} issues`);
```

**Acceptance Criteria:**
- Demonstrates both manual and convenience parsing
- Shows type-safe property access
- Compiles without type errors
- Provides good developer experience

### Phase 6: Testing

**File:** `src/utils/parseSlashCommands.test.ts`

Add tests for JSON schema parsing:

```typescript
describe('parseJsonResponseSchema', () => {
  it('should parse JSON example and field descriptions', () => {
    const markdown = `
If $format is "json", return ONLY this JSON:

\`\`\`json
{
  "success": true,
  "count": 42
}
\`\`\`

**JSON Field Descriptions:**
- \`success\`: Operation status
- \`count\`: Number of items
    `;

    const schema = parseJsonResponseSchema(markdown);
    expect(schema).toBeDefined();
    expect(schema!.exampleJson.success).toBe(true);
    expect(schema!.fieldDescriptions.get('success')).toBe('Operation status');
  });

  it('should return undefined when no JSON schema present', () => {
    const markdown = 'Just regular documentation';
    expect(parseJsonResponseSchema(markdown)).toBeUndefined();
  });

  it('should handle nested objects', () => {
    const markdown = `
If $format is "json", return ONLY this JSON:

\`\`\`json
{
  "data": {
    "nested": "value"
  }
}
\`\`\`
    `;

    const schema = parseJsonResponseSchema(markdown);
    expect(schema!.exampleJson.data).toEqual({ nested: "value" });
  });
});
```

**File:** `src/utils/generateCommandResponseTypes.test.ts` (new)

Add tests for type generation:

```typescript
describe('generateResponseTypeCode', () => {
  it('should generate interface with correct naming', () => {
    const code = generateResponseTypeCode('/review-spec', mockSchema);
    expect(code).toContain('export interface ReviewSpecResult');
  });

  it('should include JSDoc comments', () => {
    const code = generateResponseTypeCode('/test-command', {
      exampleJson: { success: true },
      fieldDescriptions: new Map([['success', 'Operation status']])
    });
    expect(code).toContain('/** Operation status */');
  });

  it('should handle nested objects', () => {
    const code = generateResponseTypeCode('/test', {
      exampleJson: { data: { nested: 1 } },
      fieldDescriptions: new Map()
    });
    expect(code).toContain('nested: number');
  });
});
```

**Acceptance Criteria:**
- All tests pass
- Coverage for edge cases (no schema, nested objects, arrays)
- Tests for type inference logic
- Tests for JSDoc generation

## Generated Output Example

**File:** `.agent/types/slash-commands.ts` (after generation)

```typescript
// Auto-generated by agent-workflows generate-slash-types
// Do not edit this file manually

// ... existing SlashCommandName and SlashCommandArgs ...

/**
 * Response type for /review-spec-implementation command
 */
export interface ReviewSpecImplementationResult {
  /** Always true if review completed */
  success: boolean;
  /** Current iteration number (1-based, auto-detected) */
  review_iteration: number;
  /** Always 3 */
  max_iterations: number;
  /** True if review_iteration > 3 */
  max_iterations_reached: boolean;
  /** Path to spec file reviewed */
  spec_path: string;
  /** Current git branch */
  branch: string;
  /** Base branch compared against (main/master) */
  base_branch: string;
  /** Number of commits since branching */
  commits_reviewed: number;
  /** Total issues in this review iteration */
  issues_found: number;
  /** Count of issues from previous review that were fixed (0 if first review) */
  previous_issues_resolved: number;
  /** Counts by priority level */
  priority_breakdown: {
    high: number;
    medium: number;
  };
  /** Counts by issue category */
  categories: {
    missing_implementations: number;
    incomplete_implementations: number;
    code_quality: number;
  };
  /** Next steps information */
  next_steps: {
    /** False if no issues found */
    has_issues: boolean;
    /** Full command to run to fix issues */
    implement_command: string;
    /** Full command to run next review (iteration auto-increments) */
    review_command: string;
  };
}

/**
 * Mapping of slash commands to their JSON response types
 */
export interface SlashCommandResponses {
  "/review-spec-implementation": ReviewSpecImplementationResult;
}
```

## Usage Example

```typescript
import { Workflow, FileStorage, generateWorkflowId, unwrap } from '@spectora/agent-workflows';
import { createClaudeAdapter } from '@sourceborn/agent-cli-sdk';
import { buildSlashCommand, type ReviewSpecImplementationResult } from './.agent/types/slash-commands.js';

const workflow = new Workflow({ storage: new FileStorage({ workflowId: generateWorkflowId() }) });
const claude = createClaudeAdapter();

// Type-safe JSON response parsing
const reviewData = unwrap(
  await workflow.executeCliStepJson<ReviewSpecImplementationResult>({
    cli: claude,
    name: 'review',
    prompt: buildSlashCommand('/review-spec-implementation', {
      'spec-file-path': '.agent/specs/feature-spec.md',
      format: 'json'
    }),
    stepNumber: 1
  })
);

// TypeScript knows the shape of reviewData!
console.log(`Review iteration ${reviewData.review_iteration} of ${reviewData.max_iterations}`);
console.log(`Found ${reviewData.issues_found} issues`);
console.log(`Priority breakdown: ${reviewData.priority_breakdown.high} high, ${reviewData.priority_breakdown.medium} medium`);

if (reviewData.next_steps.has_issues) {
  console.log(`Next: ${reviewData.next_steps.implement_command}`);
}
```

## Validation

### Manual Testing
1. Run `pnpm gen-slash-command-types` to regenerate types
2. Verify `.agent/types/slash-commands.ts` includes `ReviewSpecImplementationResult`
3. Build the project: `pnpm build` (should succeed)
4. Run example workflow: `bun run .agent/workflows/plan-implement-review-push.ts test-feature`
5. Verify type-safe property access works in IDE (auto-complete)

### Automated Testing
- All existing tests pass: `pnpm test`
- New tests for JSON parsing pass
- Type checking passes: `pnpm check-types`

## Future Enhancements

- Support for multiple response formats per command (text vs JSON)
- Runtime validation using JSON Schema or Zod
- Generate types for other command output formats
- Add schema versioning for breaking changes

## Success Criteria

- ✅ JSON schemas are parsed from command documentation
- ✅ TypeScript interfaces are generated with correct types
- ✅ JSDoc comments include field descriptions
- ✅ `executeCliStep` accepts generic type parameter
- ✅ `executeCliStepJson` convenience method works
- ✅ Example workflow demonstrates type-safe usage
- ✅ All tests pass
- ✅ Backward compatible with existing code
- ✅ No changes needed to command documentation format
