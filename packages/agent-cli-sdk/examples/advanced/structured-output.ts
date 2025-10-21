/**
 * Structured Output Example
 *
 * Demonstrates how to use responseSchema to get type-safe JSON responses
 * from Claude with Zod schema validation.
 *
 * Run with:
 *   npx tsx examples/advanced/structured-output.ts
 */

import { AgentClient, createClaudeAdapter } from '../../src/index.js';
import { z } from 'zod';

// =============================================================================
// Example 1: Basic JSON Extraction (No Validation)
// =============================================================================

async function example1_BasicJSONExtraction() {
  console.log('\n📦 Example 1: Basic JSON Extraction\n');

  const client = new AgentClient({ adapter: createClaudeAdapter() });

  // Extract JSON without validation - just parse whatever JSON is returned
  const result = await client.execute<{ name: string; age: number }>(
    'Return a JSON object with name="Alice" and age=30. Return ONLY the JSON in a markdown code block.',
    {
      responseSchema: true, // true = auto-extract JSON, no validation
      timeout: 30000,
    }
  );

  console.log('✓ Status:', result.status);
  console.log('✓ Extracted data:', result.output);
  console.log('  - Name:', result.output.name);
  console.log('  - Age:', result.output.age);
}

// =============================================================================
// Example 2: Zod Schema Validation
// =============================================================================

async function example2_ZodValidation() {
  console.log('\n🔍 Example 2: Zod Schema Validation\n');

  // Define a strict schema with validation rules
  const UserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Must be a valid email'),
    age: z.number().int().min(18, 'Must be 18 or older'),
    role: z.enum(['admin', 'user', 'guest']),
  });

  // Infer TypeScript type from schema
  type User = z.infer<typeof UserSchema>;

  const client = new AgentClient({ adapter: createClaudeAdapter() });

  const result = await client.execute<User>(
    `Return a JSON object for a user with:
- name: "Bob Smith"
- email: "bob@example.com"
- age: 25
- role: "user"

Return ONLY the JSON in a markdown code block.`,
    {
      responseSchema: UserSchema, // Validates against Zod schema
      timeout: 30000,
    }
  );

  console.log('✓ Status:', result.status);
  console.log('✓ Validated user:', result.output);
  console.log(`  - ${result.output.name} (${result.output.role})`);
  console.log(`  - ${result.output.email}`);
  console.log(`  - Age: ${result.output.age}`);
}

// =============================================================================
// Example 3: Complex Nested Schema
// =============================================================================

async function example3_NestedSchema() {
  console.log('\n🏗️  Example 3: Complex Nested Schema\n');

  const ProjectSchema = z.object({
    name: z.string(),
    description: z.string(),
    status: z.enum(['planning', 'in-progress', 'completed']),
    team: z.object({
      lead: z.string(),
      members: z.array(z.string()),
      size: z.number(),
    }),
    milestones: z.array(
      z.object({
        title: z.string(),
        dueDate: z.string(),
        completed: z.boolean(),
      })
    ),
  });

  type Project = z.infer<typeof ProjectSchema>;

  const client = new AgentClient({ adapter: createClaudeAdapter() });

  const result = await client.execute<Project>(
    `Create a project structure as JSON:
- name: "AI Agent SDK"
- description: "TypeScript SDK for AI CLIs"
- status: "in-progress"
- team: { lead: "Alice", members: ["Bob", "Carol"], size: 3 }
- milestones: [
    { title: "MVP", dueDate: "2024-03-01", completed: true },
    { title: "Beta", dueDate: "2024-06-01", completed: false }
  ]

Return ONLY the JSON in a markdown code block.`,
    {
      responseSchema: ProjectSchema,
      timeout: 45000,
    }
  );

  console.log('✓ Project:', result.output.name);
  console.log('  Status:', result.output.status);
  console.log('  Team Lead:', result.output.team.lead);
  console.log('  Team Size:', result.output.team.size);
  console.log('  Milestones:');
  result.output.milestones.forEach((m) => {
    console.log(`    - ${m.title} (${m.dueDate}) ${m.completed ? '✓' : '○'}`);
  });
}

// =============================================================================
// Example 4: Array Schema
// =============================================================================

async function example4_ArraySchema() {
  console.log('\n📋 Example 4: Array Schema\n');

  const TaskSchema = z.object({
    id: z.number(),
    title: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    estimatedHours: z.number(),
  });

  const TaskListSchema = z.array(TaskSchema);
  type TaskList = z.infer<typeof TaskListSchema>;

  const client = new AgentClient({ adapter: createClaudeAdapter() });

  const result = await client.execute<TaskList>(
    `Create a list of 4 development tasks as a JSON array. Each task should have:
- id (number)
- title (string)
- priority ("low", "medium", or "high")
- estimatedHours (number)

Return ONLY the JSON array in a markdown code block.`,
    {
      responseSchema: TaskListSchema,
      timeout: 30000,
    }
  );

  console.log(`✓ Found ${result.output.length} tasks:`);
  result.output.forEach((task) => {
    console.log(`  ${task.id}. [${task.priority.toUpperCase()}] ${task.title} (${task.estimatedHours}h)`);
  });
}

// =============================================================================
// Example 5: Code Analysis Use Case
// =============================================================================

async function example5_CodeAnalysis() {
  console.log('\n🔬 Example 5: Code Analysis\n');

  const CodeAnalysisSchema = z.object({
    language: z.string(),
    complexity: z.enum(['low', 'medium', 'high']),
    issues: z.array(
      z.object({
        type: z.enum(['error', 'warning', 'info']),
        line: z.number(),
        message: z.string(),
      })
    ),
    suggestions: z.array(z.string()),
    metrics: z.object({
      linesOfCode: z.number(),
      functions: z.number(),
      cyclomaticComplexity: z.number(),
    }),
  });

  type CodeAnalysis = z.infer<typeof CodeAnalysisSchema>;

  const sampleCode = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`;

  const client = new AgentClient({ adapter: createClaudeAdapter() });

  const result = await client.execute<CodeAnalysis>(
    `Analyze this code and return a JSON analysis:

${sampleCode}

Return JSON with:
- language: the programming language
- complexity: "low", "medium", or "high"
- issues: array of issues (type, line, message)
- suggestions: array of improvement suggestions
- metrics: { linesOfCode, functions, cyclomaticComplexity }

Return ONLY the JSON in a markdown code block.`,
    {
      responseSchema: CodeAnalysisSchema,
      timeout: 45000,
    }
  );

  console.log('✓ Language:', result.output.language);
  console.log('✓ Complexity:', result.output.complexity);
  console.log('\n  Metrics:');
  console.log('    Lines of code:', result.output.metrics.linesOfCode);
  console.log('    Functions:', result.output.metrics.functions);
  console.log('    Cyclomatic complexity:', result.output.metrics.cyclomaticComplexity);

  if (result.output.issues.length > 0) {
    console.log('\n  Issues:');
    result.output.issues.forEach((issue) => {
      console.log(`    [${issue.type.toUpperCase()}] Line ${issue.line}: ${issue.message}`);
    });
  }

  if (result.output.suggestions.length > 0) {
    console.log('\n  Suggestions:');
    result.output.suggestions.forEach((suggestion) => {
      console.log(`    • ${suggestion}`);
    });
  }
}

// =============================================================================
// Example 6: Optional Fields and Defaults
// =============================================================================

async function example6_OptionalFieldsAndDefaults() {
  console.log('\n⚙️  Example 6: Optional Fields and Defaults\n');

  const ConfigSchema = z.object({
    name: z.string(),
    version: z.string().default('1.0.0'),
    enabled: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
    metadata: z
      .object({
        author: z.string(),
        description: z.string().optional(),
      })
      .optional(),
  });

  type Config = z.infer<typeof ConfigSchema>;

  const client = new AgentClient({ adapter: createClaudeAdapter() });

  const result = await client.execute<Config>(
    `Return a minimal config JSON with just:
- name: "my-app"
- metadata: { author: "Alice" }

Return ONLY the JSON in a markdown code block.`,
    {
      responseSchema: ConfigSchema,
      timeout: 30000,
    }
  );

  console.log('✓ Config:', result.output);
  console.log('  Name:', result.output.name);
  console.log('  Version (default):', result.output.version);
  console.log('  Enabled (default):', result.output.enabled);
  console.log('  Tags (default):', result.output.tags);
  console.log('  Author:', result.output.metadata?.author);
}

// =============================================================================
// Main Runner
// =============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('Structured Output Examples - Agent CLI SDK');
  console.log('='.repeat(70));

  try {
    await example1_BasicJSONExtraction();
    await example2_ZodValidation();
    await example3_NestedSchema();
    await example4_ArraySchema();
    await example5_CodeAnalysis();
    await example6_OptionalFieldsAndDefaults();

    console.log('\n' + '='.repeat(70));
    console.log('✅ All examples completed successfully!');
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run examples
main();
