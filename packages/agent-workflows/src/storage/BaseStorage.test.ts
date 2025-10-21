import { describe, it, expect } from "vitest";
import { BaseStorage, type BaseStorageConfig } from "./BaseStorage.js";
import type { WorkflowStateData, StepStatus } from "../types/workflow.js";

// Concrete implementation for testing
class TestStorage extends BaseStorage {
  getState(): WorkflowStateData {
    return { ...this.state };
  }

  async setState(updates: Partial<WorkflowStateData>): Promise<void> {
    this.state = {
      ...this.state,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  async addFailure(stepName: string, error: Error | string): Promise<void> {
    const message = typeof error === "string" ? error : error.message;
    const stack = typeof error === "string" ? undefined : error.stack;

    const failureObject = {
      error: true,
      message,
      timestamp: new Date().toISOString(),
      ...(stack && { stack }),
    };

    const stepStatuses = { ...this.state.stepStatuses, [stepName]: "failed" as StepStatus };
    await this.setState({
      [stepName]: failureObject,
      stepStatuses,
    });
  }

  toJSON(): WorkflowStateData {
    return { ...this.state };
  }

  async load(): Promise<void> {
    // No-op for test adapter
  }
}

describe("BaseStorage", () => {
  it("should initialize with workflowId from config", () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);

    expect(storage.getWorkflowId()).toBe("test-123");
  });

  it("should initialize with default state", () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);
    const state = storage.getState();

    expect(state.workflowId).toBe("test-123");
    expect(state.status).toBe("pending");
    expect(state.createdAt).toBeDefined();
    expect(state.updatedAt).toBeDefined();
    expect(state.stepStatuses).toEqual({});
  });

  it("should be extendable by concrete implementations", () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);

    expect(storage).toBeInstanceOf(BaseStorage);
    expect(storage).toBeInstanceOf(TestStorage);
  });

  it("should store and retrieve values via setState/getState", async () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);

    await storage.setState({ step1: { result: "success" } });
    const state = storage.getState();
    expect(state.step1).toEqual({ result: "success" });
  });

  it("should track step status when provided", async () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);

    await storage.setState({
      step1: { result: "running" },
      stepStatuses: { step1: "running" }
    });
    const state = storage.getState();

    expect(state.stepStatuses?.step1).toBe("running");
  });

  it("should update updatedAt timestamp on setState", async () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);

    const initialState = storage.getState();
    const initialTime = initialState.updatedAt;

    // Wait a bit to ensure timestamp changes
    await new Promise(resolve => setTimeout(resolve, 10));

    await storage.setState({ step1: { result: "success" } });
    const updatedState = storage.getState();

    expect(updatedState.updatedAt).not.toBe(initialTime);
  });

  it("should handle failure with error object", async () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);

    const error = new Error("Test error");
    await storage.addFailure("step1", error);

    const state = storage.getState();
    const failure = state.step1 as Record<string, unknown>;
    expect(failure.error).toBe(true);
    expect(failure.message).toBe("Test error");
    expect(failure.timestamp).toBeDefined();
    expect(failure.stack).toBeDefined();
    expect(state.stepStatuses?.step1).toBe("failed");
  });

  it("should handle failure with error string", async () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);

    await storage.addFailure("step1", "String error message");

    const state = storage.getState();
    const failure = state.step1 as Record<string, unknown>;
    expect(failure.error).toBe(true);
    expect(failure.message).toBe("String error message");
    expect(failure.timestamp).toBeDefined();
    expect(failure.stack).toBeUndefined();
  });

  it("should allow partial state updates", async () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);

    await storage.setState({ branchName: "feat/test", status: "running" });
    const state = storage.getState();

    expect(state.branchName).toBe("feat/test");
    expect(state.status).toBe("running");
    expect(state.workflowId).toBe("test-123"); // Should preserve original
  });

  it("should return JSON representation", () => {
    const config: BaseStorageConfig = { workflowId: "test-123" };
    const storage = new TestStorage(config);

    const json = storage.toJSON();

    expect(json.workflowId).toBe("test-123");
    expect(json.status).toBe("pending");
    expect(json.createdAt).toBeDefined();
    expect(json.updatedAt).toBeDefined();
  });
});
