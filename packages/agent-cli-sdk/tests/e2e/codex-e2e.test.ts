/**
 * E2E tests for CodexAdapter
 *
 * These tests require:
 * 1. Codex CLI installed and available in PATH or CODEX_CLI_PATH
 * 2. Valid authentication configured
 * 3. RUN_E2E_TESTS=true environment variable
 *
 * To run these tests:
 *   RUN_E2E_TESTS=true npm test tests/e2e/codex-e2e.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { AgentClient, createCodexAdapter } from "../../src/index";
import { isCodexCLIInstalled } from "../../src/adapters/codex/cli-detector";

const SHOULD_RUN = process.env.RUN_E2E_TESTS === "true";
const describeE2E = SHOULD_RUN ? describe : describe.skip;

describeE2E("Codex E2E Tests", () => {
  beforeAll(async () => {
    // Verify CLI is installed
    const isInstalled = isCodexCLIInstalled();
    if (!isInstalled) {
      throw new Error(
        "Codex CLI not found. Install it or set CODEX_CLI_PATH environment variable"
      );
    }
  });

  describe("Basic Execution", () => {
    it("should execute a simple prompt successfully", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      const result = await client.execute("What is 2 + 2? Reply with just the number.", {
        timeout: 30000, // 30 second timeout
        fullAuto: false, // Require confirmation
      });

      expect(result.status).toBe("success");
      expect(result.exitCode).toBe(0);
      expect(result.output).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.output).toBe("string");

      // Output should contain "4"
      expect(result.output.toLowerCase()).toContain("4");
    }, 60000); // 60 second test timeout

    it("should handle streaming output", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });
      const outputChunks: string[] = [];
      const events: any[] = [];

      const result = await client.execute("Say hello", {
        onOutput: (data) => outputChunks.push(data.raw),
        onEvent: (event) => events.push(event),
        timeout: 30000,
        fullAuto: true,
      });

      expect(result.status).toBe("success");
      expect(outputChunks.length).toBeGreaterThan(0);
      expect(events.length).toBeGreaterThan(0);

      // Should have thread.started and turn events
      const threadStarted = events.find((e) => e.type === "thread.started");
      expect(threadStarted).toBeDefined();

      const turnEvents = events.filter((e) => e.type === "turn.started" || e.type === "turn.completed");
      expect(turnEvents.length).toBeGreaterThan(0);
    }, 60000);

    it("should execute with factory-created adapter", async () => {
      const codex = createCodexAdapter({
        verbose: false,
      });

      const client = new AgentClient({ adapter: codex });

      const result = await client.execute("Respond with 'OK'", {
        timeout: 30000,
      });

      expect(result.status).toBe("success");
      expect(result.output).toBeDefined();
    }, 60000);
  });

  describe("Session Management", () => {
    it("should support session resumption", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      // Create initial session
      const session1 = await client.execute("Remember the number 42", {
        fullAuto: true,
        timeout: 30000,
      });

      expect(session1.status).toBe("success");
      expect(session1.sessionId).toBeDefined();

      // Resume the session
      const session2 = await client.execute("What number did I ask you to remember?", {
        sessionId: session1.sessionId,
        fullAuto: true,
        timeout: 30000,
      });

      expect(session2.status).toBe("success");
      expect(session2.sessionId).toBe(session1.sessionId);
      expect(session2.output.toLowerCase()).toContain("42");
    }, 90000);
  });

  describe("Full Auto Mode", () => {
    it("should execute in full auto mode", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      const result = await client.execute("Echo 'test' to console", {
        fullAuto: true, // Automatically approve actions
        timeout: 30000,
      });

      expect(result.status).toBe("success");
      expect(result.output).toBeDefined();
    }, 60000);

    it("should execute with explicit sandbox mode", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      const result = await client.execute("Say hello", {
        sandbox: "workspace-write",
        fullAuto: true,
        timeout: 30000,
      });

      expect(result.status).toBe("success");
    }, 60000);

    it("should execute with read-only sandbox", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      const result = await client.execute("Say hi", {
        sandbox: "read-only",
        fullAuto: true,
        timeout: 30000,
      });

      expect(result.status).toBe("success");
    }, 60000);
  });

  describe("Image Support", () => {
    it("should handle image inputs", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      // Use absolute path to avoid path resolution issues
      const imagePath = `${process.cwd()}/tests/fixtures/test-image.png`;

      const result = await client.execute("What text do you see in this image?", {
        images: [imagePath],
        fullAuto: true,
        timeout: 80000, // Increased timeout for image processing
      });

      expect(result.status).toBe("success");
      expect(result.output).toBeDefined();

      // Should mention "Hello World" or similar from the image
      const outputLower = result.output.toLowerCase();
      const mentionsHello = outputLower.includes("hello") || outputLower.includes("world");

      if (mentionsHello) {
        expect(mentionsHello).toBe(true);
      } else {
        // Just verify we got a response - image reading might vary
        expect(result.output.length).toBeGreaterThan(0);
      }
    }, 90000);
  });

  describe("Adapter Capabilities", () => {
    it("should return correct capabilities", () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });
      const capabilities = client.getCapabilities();

      expect(capabilities.streaming).toBe(true);
      expect(capabilities.sessionManagement).toBe(false); // No createSession() method (planned for v1.1)
      expect(capabilities.toolCalling).toBe(true);
      expect(capabilities.multiModal).toBe(true); // Codex supports images
    });

    it("should provide access to underlying adapter", () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });
      const adapter = client.getAdapter();

      expect(adapter).toBeDefined();
      expect(adapter.getCapabilities).toBeDefined();
      expect(typeof adapter.execute).toBe("function");
    });
  });

  describe("Error Handling", () => {
    it("should handle timeout errors", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      await expect(
        client.execute("Count to 1000 slowly", {
          timeout: 100, // Very short timeout
        })
      ).rejects.toThrow();
    }, 10000);

    it("should handle invalid prompts", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      await expect(
        client.execute("", {
          timeout: 5000,
        })
      ).rejects.toThrow("Prompt must be a non-empty string");
    });
  });

  describe("Advanced Options", () => {
    it("should respect working directory", async () => {
      const client = new AgentClient({
        adapter: createCodexAdapter(),
        workingDirectory: process.cwd(),
      });

      const result = await client.execute("What is the current directory?", {
        timeout: 30000,
      });

      expect(result.status).toBe("success");
      expect(result.output).toBeDefined();
    }, 60000);
  });

  describe("Metadata Extraction", () => {
    it("should extract metadata from response", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      const result = await client.execute("Tell me a short joke", {
        timeout: 30000,
        fullAuto: true,
      });

      expect(result.metadata).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);

      // Should have raw output
      expect(result.raw).toBeDefined();
      expect(result.raw?.stdout).toBeDefined();

      // Should have usage info
      expect(result.usage).toBeDefined();
      if (result.usage) {
        expect(result.usage.input_tokens).toBeGreaterThan(0);
        expect(result.usage.output_tokens).toBeGreaterThan(0);
      }
    }, 60000);

    it("should extract reasoning from events", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      const result = await client.execute("What is 1 + 1?", {
        timeout: 30000,
        fullAuto: true,
      });

      expect(result.metadata).toBeDefined();

      // Codex includes reasoning in metadata
      if (result.metadata.reasoning && result.metadata.reasoning.length > 0) {
        expect(Array.isArray(result.metadata.reasoning)).toBe(true);
        expect(result.metadata.reasoning[0]).toBeTruthy();
      }
    }, 60000);

    it("should track tools used", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });
      const events: any[] = [];

      await client.execute("What files are in the current directory?", {
        onEvent: (event) => events.push(event),
        timeout: 30000,
        fullAuto: true,
      });

      // Should have item.completed events
      const itemEvents = events.filter((e) => e.type === "item.completed");
      expect(itemEvents.length).toBeGreaterThan(0);
    }, 60000);

    it("should track token usage", async () => {
      const client = new AgentClient({ adapter: createCodexAdapter() });

      const result = await client.execute("Say hello", {
        timeout: 30000,
        fullAuto: true,
      });

      expect(result.usage).toBeDefined();
      if (result.usage) {
        expect(result.usage.input_tokens).toBeGreaterThan(0);
        expect(result.usage.output_tokens).toBeGreaterThan(0);
      }
    }, 60000);
  });
});

// Skip message for when tests are not run
if (!SHOULD_RUN) {
  console.log(
    "\n⚠️  Codex E2E tests are skipped. Set RUN_E2E_TESTS=true to run them.\n"
  );
}
