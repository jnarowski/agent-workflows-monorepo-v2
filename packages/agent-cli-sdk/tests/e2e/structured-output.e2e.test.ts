/**
 * E2E tests for structured output (JSON parsing with schema validation)
 *
 * These tests require:
 * 1. Claude CLI installed and available in PATH or CLAUDE_CLI_PATH
 * 2. Valid authentication (API key or OAuth token)
 * 3. RUN_E2E_TESTS=true environment variable
 *
 * To run these tests:
 *   RUN_E2E_TESTS=true npm test tests/e2e/structured-output.e2e.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";
import { AgentClient, createClaudeAdapter } from "../../src/index";
import { detectAndValidateClaudeCLI } from "../../src/adapters/claude/cli-detector";

const SHOULD_RUN = process.env.RUN_E2E_TESTS === "true";
const describeE2E = SHOULD_RUN ? describe : describe.skip;

describeE2E("Structured Output E2E Tests", () => {
  beforeAll(async () => {
    // Verify CLI is installed
    const detection = detectAndValidateClaudeCLI();
    if (!detection.found) {
      throw new Error(
        "Claude CLI not found. Install it or set CLAUDE_CLI_PATH environment variable"
      );
    }
  });

  describe("JSON Extraction Without Validation", () => {
    it("should extract JSON from Claude response", async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute<{
        name: string;
        age: number;
        active: boolean;
      }>(
        'Return a JSON object with keys: name="Test User", age=25, active=true. Return ONLY the JSON, wrapped in a markdown code block.',
        { responseSchema: true, timeout: 30000 }
      );

      expect(result.status).toBe("success");
      expect(typeof result.data).toBe("object");
      expect(result.data).toHaveProperty("name");
      expect(result.data).toHaveProperty("age");
      expect(result.data).toHaveProperty("active");
      expect(result.data.name).toBe("Test User");
      expect(result.data.age).toBe(25);
      expect(result.data.active).toBe(true);

      // Original text preserved in raw output
      expect(result.raw?.stdout).toBeDefined();
      expect(result.raw?.stdout).toContain("json");
    }, 60000);

    it("should extract JSON from plain response without code block", async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute<{ status: string; count: number }>(
        'Return this exact JSON (no code block): {"status": "ok", "count": 42}',
        { responseSchema: true, timeout: 30000 }
      );

      expect(result.status).toBe("success");
      expect(typeof result.data).toBe("object");
      expect(result.data).toHaveProperty("status");
      expect(result.data).toHaveProperty("count");
    }, 60000);

    it("should handle response without JSON gracefully", async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      // This should throw because there's no JSON to extract
      await expect(
        client.execute(
          "Say hello world. Do not include any JSON in your response.",
          { responseSchema: true, timeout: 30000 }
        )
      ).rejects.toThrow();
    }, 60000);
  });

  describe("JSON Validation with Zod Schema", () => {
    it("should validate response against Zod schema", async () => {
      const UserSchema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      });

      type User = z.infer<typeof UserSchema>;

      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute<User>(
        'Return a JSON object with: name="John Doe", age=30, email="john@example.com". Return ONLY the JSON in a markdown code block.',
        { responseSchema: UserSchema, timeout: 30000 }
      );

      expect(result.status).toBe("success");

      // TypeScript knows the structure
      expect(result.data.name).toBe("John Doe");
      expect(result.data.age).toBe(30);
      expect(result.data.email).toBe("john@example.com");
      expect(typeof result.data.name).toBe("string");
      expect(typeof result.data.age).toBe("number");
    }, 60000);

    it("should handle complex nested schema", async () => {
      const WeatherSchema = z.object({
        location: z.object({
          city: z.string(),
          country: z.string(),
        }),
        temperature: z.number(),
        conditions: z.string(),
        humidity: z.number(),
      });

      type Weather = z.infer<typeof WeatherSchema>;

      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute<Weather>(
        'Return weather data as JSON: location with city="San Francisco" and country="USA", temperature=72, conditions="Sunny", humidity=60. Return ONLY the JSON in a markdown code block.',
        { responseSchema: WeatherSchema, timeout: 30000 }
      );

      expect(result.status).toBe("success");
      expect(result.data.location.city).toBe("San Francisco");
      expect(result.data.location.country).toBe("USA");
      expect(result.data.temperature).toBe(72);
      expect(result.data.conditions).toBe("Sunny");
      expect(result.data.humidity).toBe(60);
    }, 60000);

    it("should handle array schema", async () => {
      const ItemSchema = z.object({
        id: z.number(),
        name: z.string(),
        price: z.number(),
      });

      const ProductsSchema = z.array(ItemSchema);
      type Products = z.infer<typeof ProductsSchema>;

      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute<Products>(
        "Return an array of 3 products as JSON. Each product has id (number), name (string), price (number). Return ONLY the JSON array in a markdown code block.",
        { responseSchema: ProductsSchema, timeout: 30000 }
      );

      expect(result.status).toBe("success");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(2);

      // Check first product structure
      expect(result.data[0]).toHaveProperty("id");
      expect(result.data[0]).toHaveProperty("name");
      expect(result.data[0]).toHaveProperty("price");
      expect(typeof result.data[0].id).toBe("number");
      expect(typeof result.data[0].name).toBe("string");
      expect(typeof result.data[0].price).toBe("number");
    }, 60000);
  });

  describe("Validation Failures", () => {
    it("should throw on validation errors", async () => {
      const StrictSchema = z.object({
        count: z.number().min(100), // Require count >= 100
        status: z.enum(["active", "inactive"]),
      });

      const client = new AgentClient({ adapter: createClaudeAdapter() });

      // This should fail validation and throw
      await expect(
        client.execute(
          'Return JSON with count=5 (a number less than 100) and status="pending". Return ONLY the JSON in a markdown code block.',
          { responseSchema: StrictSchema, timeout: 30000 }
        )
      ).rejects.toThrow();
    }, 60000);

    it("should throw on missing required fields", async () => {
      const RequiredFieldsSchema = z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string(), // Required field
      });

      const client = new AgentClient({ adapter: createClaudeAdapter() });

      // Missing 'phone' field should cause validation to fail
      await expect(
        client.execute(
          'Return JSON with only name="Test" and email="test@example.com". Do NOT include a phone field. Return ONLY the JSON in a markdown code block.',
          { responseSchema: RequiredFieldsSchema, timeout: 30000 }
        )
      ).rejects.toThrow();
    }, 60000);
  });

  describe("Backwards Compatibility", () => {
    it("should work normally without responseSchema", async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute('Say "Hello, World!"', {
        timeout: 30000,
      });

      expect(result.status).toBe("success");
      expect(typeof result.data).toBe("string");
      expect(result.data).toContain("Hello");
    }, 60000);

    it("should return string output when responseSchema not provided", async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute(
        "What is 2+2? Answer with just the number.",
        {
          timeout: 30000,
        }
      );

      expect(result.status).toBe("success");
      expect(typeof result.data).toBe("string");
      expect(result.data).toContain("4");
    }, 60000);
  });

  describe("Schema Transformations", () => {
    it("should apply Zod transformations and defaults", async () => {
      const Schema = z.object({
        name: z.string(),
        timestamp: z.string().optional(),
        count: z.number().default(0),
        tags: z.array(z.string()).default([]),
      });

      type Data = z.infer<typeof Schema>;

      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute<Data>(
        'Return JSON with just name="Test". Return ONLY the JSON in a markdown code block.',
        { responseSchema: Schema, timeout: 30000 }
      );

      expect(result.status).toBe("success");
      expect(result.data.name).toBe("Test");
      // Defaults should be applied by Zod
      expect(result.data.count).toBe(0);
      expect(Array.isArray(result.data.tags)).toBe(true);
    }, 60000);

    it("should handle optional fields correctly", async () => {
      const Schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable().optional(),
      });

      type Data = z.infer<typeof Schema>;

      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute<Data>(
        'Return JSON with required="value", optional="present", nullable=null. Return ONLY the JSON in a markdown code block.',
        { responseSchema: Schema, timeout: 30000 }
      );

      expect(result.status).toBe("success");
      expect(result.data.required).toBe("value");
      expect(result.data.optional).toBe("present");
      expect(result.data.nullable).toBe(null);
    }, 60000);
  });

  describe("Real-world Use Cases", () => {
    it("should parse code analysis results", async () => {
      const AnalysisSchema = z.object({
        language: z.string(),
        linesOfCode: z.number(),
        functions: z.array(z.string()),
        complexity: z.enum(["low", "medium", "high"]),
      });

      type Analysis = z.infer<typeof AnalysisSchema>;

      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute<Analysis>(
        'Analyze this code and return JSON: language="typescript", linesOfCode=42, functions=["main", "helper"], complexity="low". Return ONLY the JSON in a markdown code block.',
        { responseSchema: AnalysisSchema, timeout: 30000 }
      );

      expect(result.status).toBe("success");
      expect(result.data.language).toBe("typescript");
      expect(result.data.linesOfCode).toBe(42);
      expect(Array.isArray(result.data.functions)).toBe(true);
      expect(["low", "medium", "high"]).toContain(result.data.complexity);
    }, 60000);

    it("should parse structured task breakdown", async () => {
      const TaskSchema = z.object({
        title: z.string(),
        steps: z.array(
          z.object({
            step: z.number(),
            description: z.string(),
            estimatedMinutes: z.number(),
          })
        ),
        totalEstimate: z.number(),
      });

      type Task = z.infer<typeof TaskSchema>;

      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute<Task>(
        'Create a task breakdown for "Setup testing" with 3 steps. Return as JSON with title, steps array (each with step number, description, estimatedMinutes), and totalEstimate. Return ONLY the JSON in a markdown code block.',
        { responseSchema: TaskSchema, timeout: 45000 }
      );

      expect(result.status).toBe("success");
      expect(result.data.title).toBeDefined();
      expect(Array.isArray(result.data.steps)).toBe(true);
      expect(result.data.steps.length).toBeGreaterThanOrEqual(2);
      expect(result.data.totalEstimate).toBeGreaterThan(0);
    }, 60000);
  });
});

// Skip message for when tests are not run
if (!SHOULD_RUN) {
  console.log(
    "\n⚠️  Structured Output E2E tests are skipped. Set RUN_E2E_TESTS=true to run them.\n"
  );
}
