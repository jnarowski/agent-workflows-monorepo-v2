import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import { join } from "path";
import { FileStorage, type FileStorageConfig } from "./FileStorage.js";

const TEST_STATE_DIR = ".agent/workflows/logs-test";

describe("FileStorage", () => {
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
    it("should accept config object with workflowId", () => {
      const uniqueId = `test-constructor-${Date.now()}`;
      const config: FileStorageConfig = { workflowId: uniqueId };
      const storage = new FileStorage(config);

      expect(storage.getWorkflowId()).toBe(uniqueId);
    });

    it("should use default stateDir if not provided", () => {
      const uniqueId = `test-default-dir-${Date.now()}`;
      const config: FileStorageConfig = { workflowId: uniqueId };
      const storage = new FileStorage(config);

      expect(storage.getStateDir()).toBe(".agent/workflows/logs");
    });

    it("should use custom stateDir from config", () => {
      const uniqueId = `test-custom-dir-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      expect(storage.getStateDir()).toBe(TEST_STATE_DIR);
    });
  });

  describe("state persistence", () => {
    it("should save state to disk on setState", async () => {
      const uniqueId = `test-save-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.setState({ step1: { result: "success" } });

      const statePath = join(TEST_STATE_DIR, uniqueId, "state.json");
      const fileContents = await fs.readFile(statePath, "utf-8");
      const data = JSON.parse(fileContents);

      expect(data.workflowId).toBe(uniqueId);
      expect(data.step1).toEqual({ result: "success" });
    });

    it("should create directories recursively", async () => {
      const uniqueId = `test-mkdir-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.setState({ step1: { result: "success" } });

      const workflowDir = join(TEST_STATE_DIR, uniqueId);
      const stats = await fs.stat(workflowDir);

      expect(stats.isDirectory()).toBe(true);
    });

    it("should load state from disk", async () => {
      const uniqueId = `test-load-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      // Save some data
      await storage.setState({ step1: { result: "success" } });
      await storage.setState({ step2: { result: "completed" } });

      // Small delay to ensure file write is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new adapter and load
      const newStorage = new FileStorage(config);
      await newStorage.load();

      expect(newStorage.getState().step1).toEqual({ result: "success" });
      expect(newStorage.getState().step2).toEqual({ result: "completed" });
    });

    it("should preserve state properties on load", async () => {
      const uniqueId = `test-metadata-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.setState({ branchName: "feat/test", status: "running" });
      await storage.setState({ step1: { result: "success" } });

      // Small delay to ensure file write is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load in new adapter
      const newStorage = new FileStorage(config);
      await newStorage.load();

      const state = newStorage.getState();
      expect(state.branchName).toBe("feat/test");
      expect(state.status).toBe("running");
    });

    it("should throw on load for non-existent file", async () => {
      const uniqueId = `test-nonexistent-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      // Should throw ENOENT
      await expect(storage.load()).rejects.toThrow();
    });
  });

  describe("state management", () => {
    it("should include all properties in saved state", async () => {
      const uniqueId = `test-meta-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.setState({ branchName: "feat/test" });
      await storage.setState({ step1: { result: "success" } });

      const statePath = join(TEST_STATE_DIR, uniqueId, "state.json");
      const fileContents = await fs.readFile(statePath, "utf-8");
      const data = JSON.parse(fileContents);

      expect(data.workflowId).toBe(uniqueId);
      expect(data.branchName).toBe("feat/test");
      expect(data.step1).toEqual({ result: "success" });
    });

    it("should auto-update updatedAt timestamp on setState", async () => {
      const uniqueId = `test-timestamp-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      const initialState = storage.getState();
      const initialTime = initialState.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      await storage.setState({ step1: { result: "success" } });
      const updatedState = storage.getState();

      expect(updatedState.updatedAt).not.toBe(initialTime);
    });

    it("should auto-update updatedAt on setState with properties", async () => {
      const uniqueId = `test-timestamp-props-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      const initialState = storage.getState();
      const initialTime = initialState.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      await storage.setState({ branchName: "feat/test" });
      const updatedState = storage.getState();

      expect(updatedState.updatedAt).not.toBe(initialTime);
    });
  });

  describe("step status tracking", () => {
    it("should track step status when provided to setState", async () => {
      const uniqueId = `test-status-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.setState({
        step1: { result: "running" },
        stepStatuses: { step1: "running" }
      });
      await storage.setState({
        step2: { result: "completed" },
        stepStatuses: { ...storage.getState().stepStatuses, step2: "completed" }
      });

      const state = storage.getState();
      expect(state.stepStatuses?.step1).toBe("running");
      expect(state.stepStatuses?.step2).toBe("completed");
    });

    it("should update step status to failed on addFailure", async () => {
      const uniqueId = `test-failure-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.addFailure("step1", new Error("Test error"));

      const state = storage.getState();
      expect(state.stepStatuses?.step1).toBe("failed");
    });

    it("should persist step statuses to disk", async () => {
      const uniqueId = `test-persist-status-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.setState({
        step1: { result: "running" },
        stepStatuses: { step1: "running" }
      });
      await storage.setState({
        step2: { result: "completed" },
        stepStatuses: { ...storage.getState().stepStatuses, step2: "completed" }
      });

      // Small delay to ensure file write is complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const statePath = join(TEST_STATE_DIR, uniqueId, "state.json");
      const fileContents = await fs.readFile(statePath, "utf-8");
      const data = JSON.parse(fileContents);

      expect(data.stepStatuses.step1).toBe("running");
      expect(data.stepStatuses.step2).toBe("completed");
    });
  });

  describe("static load method", () => {
    it("should load existing workflow from disk", async () => {
      const uniqueId = `test-static-load-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.setState({ step1: { result: "success" } });

      const result = await FileStorage.load(config);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.getState().step1).toEqual({ result: "success" });
      }
    });

    it("should return error for non-existent workflow", async () => {
      const uniqueId = `test-null-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };

      const result = await FileStorage.load(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("toJSON", () => {
    it("should include all state properties in JSON output", async () => {
      const uniqueId = `test-json-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.setState({ step1: { result: "success" } });
      await storage.setState({ branchName: "feat/test" });

      const json = storage.toJSON();

      expect(json.workflowId).toBe(uniqueId);
      expect(json.step1).toEqual({ result: "success" });
      expect(json.branchName).toBe("feat/test");
    });
  });

  describe("backward compatibility", () => {
    it("should maintain same file structure as old WorkflowState", async () => {
      const uniqueId = `test-compat-${Date.now()}`;
      const config: FileStorageConfig = {
        workflowId: uniqueId,
        stateDir: TEST_STATE_DIR,
      };
      const storage = new FileStorage(config);

      await storage.setState({ step1: { result: "success" } });

      // Check that file is at expected location
      const statePath = join(TEST_STATE_DIR, uniqueId, "state.json");
      const stats = await fs.stat(statePath);

      expect(stats.isFile()).toBe(true);
    });
  });
});
