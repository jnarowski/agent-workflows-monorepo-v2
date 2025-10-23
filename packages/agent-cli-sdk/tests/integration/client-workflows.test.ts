import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentClient } from "../../src/client/agent-client";
import type { AIAdapter, AdapterCapabilities } from "../../src/core/interfaces";
import type { ExecutionResponse, ExecutionOptions } from "../../src/types/interfaces";

/**
 * Mock adapter for testing client workflows
 */
class MockAdapter implements AIAdapter {
  private executionCount = 0;
  private responses: ExecutionResponse[] = [];

  async execute<T = string>(
    prompt: string,
    options?: ExecutionOptions
  ): Promise<ExecutionResponse<T>> {
    this.executionCount++;

    const response: ExecutionResponse<T> = {
      output: `Mock response ${this.executionCount}: ${prompt}` as T,
      sessionId: options?.sessionId || `mock-session-${this.executionCount}`,
      status: "success",
      exitCode: 0,
      duration: 100,
      metadata: {},
    };

    this.responses.push(response as ExecutionResponse);

    // Simulate callbacks if provided
    if (options?.onStream) {
      options.onStream({
        type: "text",
        data: { text: response.output as string },
        timestamp: Date.now(),
      });
    }

    return response;
  }

  getCapabilities(): AdapterCapabilities {
    return {
      streaming: true,
      sessionManagement: true,
      toolCalling: false,
      multiModal: false,
    };
  }

  getExecutionCount(): number {
    return this.executionCount;
  }

  getResponses(): ExecutionResponse[] {
    return this.responses;
  }

  reset(): void {
    this.executionCount = 0;
    this.responses = [];
  }
}

describe("AgentClient - Workflow Integration", () => {
  let mockAdapter: MockAdapter;
  let client: AgentClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    client = new AgentClient({ adapter: mockAdapter });
  });

  describe("Single Execution Workflows", () => {
    it("should execute a single prompt successfully", async () => {
      const result = await client.execute("Create a function");

      expect(result.status).toBe("success");
      expect(result.output).toContain("Create a function");
      expect(result.sessionId).toBeDefined();
      expect(mockAdapter.getExecutionCount()).toBe(1);
    });

    it("should handle execution with callbacks", async () => {
      const outputChunks: string[] = [];
      const events: any[] = [];

      const result = await client.execute("Test prompt", {
        onOutput: (data) => outputChunks.push(data.raw),
        onEvent: (event) => events.push(event),
      });

      expect(result.status).toBe("success");
      expect(mockAdapter.getExecutionCount()).toBe(1);
    });

    it("should pass through adapter-specific options", async () => {
      const result = await client.execute("Test prompt", {
        customOption: "test-value",
        timeout: 5000,
      });

      expect(result.status).toBe("success");
    });
  });

  describe("Multi-turn Execution Workflows", () => {
    it("should handle session resumption", async () => {
      // First execution
      const result1 = await client.execute("Create a function");
      const sessionId = result1.sessionId;

      // Second execution with resume
      const result2 = await client.execute("Add error handling", {
        sessionId,
        resume: true,
      });

      expect(result2.sessionId).toBe(sessionId);
      expect(mockAdapter.getExecutionCount()).toBe(2);
    });

    it("should track multiple independent sessions", async () => {
      const result1 = await client.execute("Task 1");
      const result2 = await client.execute("Task 2");
      const result3 = await client.execute("Task 3");

      expect(result1.sessionId).not.toBe(result2.sessionId);
      expect(result2.sessionId).not.toBe(result3.sessionId);
      expect(mockAdapter.getExecutionCount()).toBe(3);
    });
  });

  describe("Client Configuration", () => {
    it("should apply default configuration to executions", async () => {
      const configuredClient = new AgentClient({
        adapter: mockAdapter,
        workingDir: "/test/dir",
        verbose: true,
      });

      const result = await configuredClient.execute("Test");

      expect(result.status).toBe("success");
    });

    it("should allow execution options to override defaults", async () => {
      const configuredClient = new AgentClient({
        adapter: mockAdapter,
        workingDir: "/default/dir",
      });

      const result = await configuredClient.execute("Test", {
        workingDir: "/override/dir",
      });

      expect(result.status).toBe("success");
    });
  });

  describe("Adapter Access", () => {
    it("should provide access to underlying adapter", () => {
      const adapter = client.getAdapter();

      expect(adapter).toBe(mockAdapter);
    });

    it("should expose adapter capabilities", () => {
      const capabilities = client.getCapabilities();

      expect(capabilities.streaming).toBe(true);
      expect(capabilities.sessionManagement).toBe(true);
      expect(capabilities.toolCalling).toBe(false);
      expect(capabilities.multiModal).toBe(false);
    });
  });

  describe("Sequential Workflow", () => {
    it("should execute a multi-step workflow sequentially", async () => {
      // Step 1: Generate code
      const step1 = await client.execute("Create a user validator");
      expect(step1.status).toBe("success");

      // Step 2: Add tests
      const step2 = await client.execute("Add unit tests", {
        sessionId: step1.sessionId,
        resume: true,
      });
      expect(step2.status).toBe("success");
      expect(step2.sessionId).toBe(step1.sessionId);

      // Step 3: Add documentation
      const step3 = await client.execute("Add JSDoc comments", {
        sessionId: step1.sessionId,
        resume: true,
      });
      expect(step3.status).toBe("success");
      expect(step3.sessionId).toBe(step1.sessionId);

      expect(mockAdapter.getExecutionCount()).toBe(3);
    });
  });

  describe("Error Handling", () => {
    it("should handle adapter errors gracefully", async () => {
      const errorAdapter: AIAdapter = {
        async execute() {
          throw new Error("Adapter execution failed");
        },
        getCapabilities() {
          return {
            streaming: false,
            sessionManagement: false,
            toolCalling: false,
            multiModal: false,
          };
        },
      };

      const errorClient = new AgentClient({ adapter: errorAdapter });

      await expect(errorClient.execute("Test")).rejects.toThrow(
        "Adapter execution failed"
      );
    });
  });
});
