import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import { Workflow, type WorkflowConfig, type ExecuteStepConfig, type ExecuteCliStepConfig } from "./Workflow.js";
import { FileStorage, type FileStorageConfig } from "../storage/FileStorage.js";
import type { Cli, ExecutionResponse } from "../types/workflow.js";

const TEST_STATE_DIR = ".agent/workflows/logs-test-workflow";

// Mock CLI tool for testing
const createMockCli = (response: Partial<ExecutionResponse> = {}): Cli => ({
  async execute<T>(): Promise<ExecutionResponse<T>> {
    return {
      output: "" as T,
      sessionId: "test-session",
      status: "success",
      exitCode: 0,
      duration: 100,
      metadata: {},
      ...response,
    } as ExecutionResponse<T>;
  },
  getCapabilities() {
    return {
      streaming: false,
      sessionManagement: false,
      toolCalling: false,
      multiModal: false,
    };
  },
});

describe("Workflow", () => {
  beforeEach(async () => {
    // Clean up test directory before each test
    try {
      await fs.rm(TEST_STATE_DIR, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
    // Ensure the base directory exists
    await fs.mkdir(TEST_STATE_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory after each test
    try {
      await fs.rm(TEST_STATE_DIR, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  describe("constructor", () => {
    it("should accept config object with adapter", () => {
      const adapterConfig: FileStorageConfig = {
        workflowId: "test-123",
        stateDir: TEST_STATE_DIR,
      };
      const config: WorkflowConfig = {
        storage: new FileStorage(adapterConfig),
      };
      const workflow = new Workflow(config);

      expect(workflow.id).toBe("test-123");
    });

    it("should provide readonly id property", () => {
      const adapterConfig: FileStorageConfig = {
        workflowId: "test-456",
        stateDir: TEST_STATE_DIR,
      };
      const config: WorkflowConfig = {
        storage: new FileStorage(adapterConfig),
      };
      const workflow = new Workflow(config);

      expect(workflow.id).toBe("test-456");
    });

    it("should accept optional cwd parameter for git operations", () => {
      const adapterConfig: FileStorageConfig = {
        workflowId: "test-789",
        stateDir: TEST_STATE_DIR,
      };
      const config: WorkflowConfig = {
        storage: new FileStorage(adapterConfig),
        cwd: process.cwd(), // Use actual directory for git validation
      };
      const workflow = new Workflow(config);

      expect(workflow.id).toBe("test-789");
      // Git instance is initialized with custom cwd
      // (private property, tested implicitly through git operations)
    });

    it("should default cwd to process.cwd() when not provided", () => {
      const adapterConfig: FileStorageConfig = {
        workflowId: "test-default-cwd",
        stateDir: TEST_STATE_DIR,
      };
      const config: WorkflowConfig = {
        storage: new FileStorage(adapterConfig),
      };
      const workflow = new Workflow(config);

      expect(workflow.id).toBe("test-default-cwd");
      // Git instance uses process.cwd() by default
    });
  });

  describe("state management", () => {
    it("should get and set state values", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      await workflow.setState({ key1: "value1" });
      expect(workflow.getState().key1).toBe("value1");
    });

    it("should get and set state properties", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      await workflow.setState({ branchName: "feat/test", status: "running" });
      const state = workflow.getState();

      expect(state.branchName).toBe("feat/test");
      expect(state.status).toBe("running");
    });
  });

  describe("convenience methods", () => {
    it("should set branch name via setState", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      await workflow.setState({ branchName: "feat/new-feature" });
      const state = workflow.getState();

      expect(state.branchName).toBe("feat/new-feature");
    });

    it("should get and set status", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      await workflow.setState({ status: "running" });
      expect(workflow.getState().status).toBe("running");

      await workflow.setState({ status: "completed" });
      expect(workflow.getState().status).toBe("completed");
    });

    it("should automatically set completedAt when status is set to completed", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      // Initially no completedAt
      expect(workflow.getState().completedAt).toBeUndefined();

      await workflow.setState({ status: "running" });
      expect(workflow.getState().completedAt).toBeUndefined();

      // completedAt should be set when status changes to completed
      await workflow.setState({ status: "completed" });
      const state = workflow.getState();
      expect(state.status).toBe("completed");
      expect(state.completedAt).toBeDefined();
      expect(typeof state.completedAt).toBe("string");

      // Verify it's a valid ISO timestamp
      const completedAt = state.completedAt as string;
      expect(new Date(completedAt).toISOString()).toBe(completedAt);
    });

    it("should not override completedAt if already set", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      // Set completed first time
      await workflow.setState({ status: "completed" });
      const firstCompletedAt = workflow.getState().completedAt;

      // Wait a bit to ensure timestamp would be different
      await new Promise(resolve => setTimeout(resolve, 10));

      // Set completed again - completedAt should not change
      await workflow.setState({ status: "completed" });
      const secondCompletedAt = workflow.getState().completedAt;

      expect(secondCompletedAt).toBe(firstCompletedAt);
    });

    it("should set and get step state", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      await workflow.setStepState("analyze", { result: "success", findings: ["item1", "item2"] });

      const stepState = workflow.getStepState("analyze");
      expect(stepState).toEqual({ result: "success", findings: ["item1", "item2"] });

      // Verify it's stored in steps namespace
      expect(workflow.getState().steps?.analyze).toEqual({ result: "success", findings: ["item1", "item2"] });
    });
  });

  describe("executeStep", () => {
    it("should execute step with config object", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      const stepConfig: ExecuteStepConfig<{ result: string }> = {
        fn: async () => ({ result: "success" }),
      };

      const result = await workflow.executeStep("test-step", stepConfig);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ result: "success" });
      }
      expect(workflow.getState().steps?.["test-step"]).toEqual({ result: "success" });
    });

    it("should mark step as running then completed", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      const stepConfig: ExecuteStepConfig = {
        fn: async () => {
          // Check that step is marked as running during execution
          const state = workflow.getState();
          expect(state.stepStatuses?.["test-step"]).toBe("running");
          return { result: "success" };
        },
      };

      await workflow.executeStep("test-step", stepConfig);

      // After execution, should be marked as completed
      const state = workflow.getState();
      expect(state.stepStatuses?.["test-step"]).toBe("completed");
    });

    it("should mark step as failed on error", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      const stepConfig: ExecuteStepConfig = {
        fn: async () => {
          throw new Error("Test error");
        },
      };

      const result = await workflow.executeStep("test-step", stepConfig);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Test error");
      }

      const state = workflow.getState();
      expect(state.stepStatuses?.["test-step"]).toBe("failed");

      const failure = state.steps?.["test-step"] as Record<string, unknown>;
      expect(failure.error).toBe(true);
      expect(failure.message).toBe("Test error");
    });

    it("should auto-increment currentStepNumber", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      expect(workflow.currentStepNumber).toBe(0);

      await workflow.executeStep("step1", {
        fn: async () => ({ result: "success" }),
      });

      expect(workflow.currentStepNumber).toBe(1);

      await workflow.executeStep("step2", {
        fn: async () => ({ result: "success" }),
      });

      expect(workflow.currentStepNumber).toBe(2);
    });

    it("should include step number in logging", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      const consoleSpy = vi.spyOn(console, "log");

      const stepConfig: ExecuteStepConfig = {
        fn: async () => ({ result: "success" }),
      };

      await workflow.executeStep("test-step", stepConfig);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Step 1: test-step"));

      consoleSpy.mockRestore();
    });
  });

  describe("executeCliStep", () => {
    it("should execute CLI step with config object", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      const mockCli = createMockCli({ status: "success", output: "test output" });

      const stepConfig: ExecuteCliStepConfig = {
        cli: mockCli,
        prompt: "Test prompt",
      };

      const result = await workflow.executeCliStep("test-cli-step", stepConfig);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.status).toBe("success");
        expect(result.data.output).toBe("test output");
      }

      // The entire ExecutionResponse is stored in the step state
      const stepState = workflow.getState().steps?.["test-cli-step"] as ExecutionResponse;
      expect(stepState.status).toBe("success");
      expect(stepState.output).toBe("test output");
    });

    it("should mark step as running then completed", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      const mockCli = createMockCli({ status: "success" });

      const stepConfig: ExecuteCliStepConfig = {
        cli: mockCli,
        prompt: "Test prompt",
      };

      await workflow.executeCliStep("test-cli-step", stepConfig);

      const state = workflow.getState();
      expect(state.stepStatuses?.["test-cli-step"]).toBe("completed");
    });

    it("should handle error status from adapter", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      const mockCli = createMockCli({
        status: "error",
        error: { code: "TEST_ERROR", message: "Test error" }
      });

      const stepConfig: ExecuteCliStepConfig = {
        cli: mockCli,
        prompt: "Test prompt",
      };

      const result = await workflow.executeCliStep("test-cli-step", stepConfig);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Test error");
      }

      const state = workflow.getState();
      expect(state.stepStatuses?.["test-cli-step"]).toBe("failed");
    });

    it("should handle timeout status from adapter", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      const mockCli = createMockCli({
        status: "timeout",
        error: { code: "TIMEOUT", message: "Timeout error" }
      });

      const stepConfig: ExecuteCliStepConfig = {
        cli: mockCli,
        prompt: "Test prompt",
      };

      const result = await workflow.executeCliStep("test-cli-step", stepConfig);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Timeout error");
      }

      const state = workflow.getState();
      expect(state.stepStatuses?.["test-cli-step"]).toBe("failed");
    });

    it("should catch and handle exceptions", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      const mockCli: Cli = {
        execute: async () => {
          throw new Error("Network error");
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

      const stepConfig: ExecuteCliStepConfig = {
        cli: mockCli,
        prompt: "Test prompt",
      };

      const result = await workflow.executeCliStep("test-cli-step", stepConfig);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Network error");
      }

      const state = workflow.getState();
      expect(state.stepStatuses?.["test-cli-step"]).toBe("failed");
    });

    it("should pass options to adapter", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      let receivedOptions: Record<string, unknown> | undefined;
      const mockCli: Cli = {
        execute: async <T>(_prompt: string, options?: Record<string, unknown>): Promise<ExecutionResponse<T>> => {
          receivedOptions = options;
          return {
            output: "" as T,
            sessionId: "test-session",
            status: "success",
            exitCode: 0,
            duration: 100,
            metadata: {},
          } as ExecutionResponse<T>;
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

      const stepConfig: ExecuteCliStepConfig = {
        cli: mockCli,
        prompt: "Test prompt",
        cliOptions: {
          model: "sonnet",
          dangerouslySkipPermissions: true,
        },
      };

      await workflow.executeCliStep("test-cli-step", stepConfig);

      expect(receivedOptions).toBeDefined();
      expect(receivedOptions?.model).toBe("sonnet");
      expect(receivedOptions?.dangerouslySkipPermissions).toBe(true);
    });
  });

  describe("static factory methods", () => {
    it("should create workflow with static create", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };

      const workflow = await Workflow.create(config);

      expect(workflow.id).toBe("test-123");
    });

    it("should load existing workflow with static load", async () => {
      const adapterConfig: FileStorageConfig = {
        workflowId: "test-123",
        stateDir: TEST_STATE_DIR,
      };

      // Create and save workflow
      const workflow1 = new Workflow({
        storage: new FileStorage(adapterConfig),
      });
      await workflow1.setStepState("step1", { result: "success" });
      await workflow1.setState({ branchName: "feat/test" });

      // Load workflow
      const result = await Workflow.load({
        storage: new FileStorage(adapterConfig),
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.getState().steps?.step1).toEqual({ result: "success" });
        expect(result.data.getState().branchName).toBe("feat/test");
      }
    });

    it("should return error for non-existent workflow", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "nonexistent",
          stateDir: TEST_STATE_DIR,
        }),
      };

      const result = await Workflow.load(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("integration", () => {
    it("should execute multiple steps and track status", async () => {
      const config: WorkflowConfig = {
        storage: new FileStorage({
          workflowId: "test-123",
          stateDir: TEST_STATE_DIR,
        }),
      };
      const workflow = new Workflow(config);

      await workflow.setState({ branchName: "feat/multi-step" });
      await workflow.setState({ status: "running" });

      // Step 1
      await workflow.executeStep("step1", {
        fn: async () => ({ result: "step1-complete" }),
      });

      // Step 2
      const mockCli = createMockCli({ status: "success", output: "step2-output" });
      await workflow.executeCliStep("step2", {
        cli: mockCli,
        prompt: "Execute step 2",
      });

      // Step 3
      await workflow.executeStep("step3", {
        fn: async () => ({ result: "step3-complete" }),
      });

      await workflow.setState({ status: "completed" });

      const state = workflow.getState();
      expect(state.status).toBe("completed");
      expect(state.branchName).toBe("feat/multi-step");
      expect(state.stepStatuses?.step1).toBe("completed");
      expect(state.stepStatuses?.step2).toBe("completed");
      expect(state.stepStatuses?.step3).toBe("completed");

      expect(state.steps?.step1).toEqual({ result: "step1-complete" });
      expect(state.steps?.step3).toEqual({ result: "step3-complete" });
    });
  });
});
