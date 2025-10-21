import fs from "fs/promises";
import { join } from "path";
import { BaseStorage, type BaseStorageConfig } from "./BaseStorage.js";
import type { WorkflowStateData, StepStatus } from "../types/workflow.js";
import type { Result } from "../utils/result.js";
import { ok, err } from "../utils/result.js";

/**
 * Configuration for FileStorage adapter.
 *
 * @example
 * const config: FileStorageConfig = {
 *   workflowId: "my-workflow-123",
 *   stateDir: ".agent/workflows/logs"  // optional, defaults to this value
 * };
 * const storage = new FileStorage(config);
 */
export interface FileStorageConfig extends BaseStorageConfig {
  /** Optional directory path where workflow state will be saved. Defaults to ".agent/workflows/logs" */
  stateDir?: string;
}

/**
 * FileStorage implements workflow state persistence using the local filesystem.
 * State is stored at: .agent/workflows/logs/{id}/state.json
 */
export class FileStorage extends BaseStorage {
  private stateDir: string;

  constructor(config: FileStorageConfig) {
    super(config);
    this.stateDir = config.stateDir || ".agent/workflows/logs";
  }

  /**
   * Gets the state directory path.
   */
  getStateDir(): string {
    return this.stateDir;
  }

  /**
   * Gets the entire workflow state.
   */
  getState(): WorkflowStateData {
    return { ...this.state };
  }

  /**
   * Sets workflow state (partial update) and saves to disk.
   */
  async setState(updates: Partial<WorkflowStateData>): Promise<void> {
    // Update state with new values
    this.state = {
      ...this.state,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Auto-set completedAt when status changes to "completed"
    if (updates.status === "completed" && !this.state.completedAt) {
      this.state.completedAt = new Date().toISOString();
    }

    await this.save();
  }

  /**
   * Adds a failure entry to the workflow state.
   */
  async addFailure(stepName: string, error: Error | string): Promise<void> {
    const message = typeof error === "string" ? error : error.message;
    const stack = typeof error === "string" ? undefined : error.stack;

    const failureObject = {
      error: true,
      message,
      timestamp: new Date().toISOString(),
      ...(stack && { stack }),
    };

    // Update step data in steps namespace and mark as failed
    const currentSteps = this.state.steps || {};
    const stepStatuses = { ...this.state.stepStatuses, [stepName]: "failed" as StepStatus };

    await this.setState({
      steps: {
        ...currentSteps,
        [stepName]: failureObject,
      },
      stepStatuses,
    });
  }

  /**
   * Returns the workflow state as JSON.
   */
  toJSON(): WorkflowStateData {
    return { ...this.state };
  }

  /**
   * Loads workflow state from disk.
   * @throws Error if file doesn't exist (ENOENT) or other IO errors
   */
  async load(): Promise<void> {
    const statePath = join(
      this.stateDir,
      this.workflowId,
      "state.json"
    );

    const fileContents = await fs.readFile(statePath, "utf-8");
    const data = JSON.parse(fileContents) as WorkflowStateData;

    this.state = data;
  }

  /**
   * Loads an existing workflow from disk.
   * @returns Result containing FileStorage instance or error message
   */
  static async load(
    config: FileStorageConfig
  ): Promise<Result<FileStorage, string>> {
    try {
      const instance = new FileStorage(config);
      await instance.load();
      return ok(instance);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return err(`Workflow "${config.workflowId}" not found`);
      }
      const message = error instanceof Error ? error.message : String(error);
      return err(`Failed to load workflow: ${message}`);
    }
  }

  /**
   * Saves the workflow state to disk.
   */
  private async save(): Promise<void> {
    const workflowDir = join(this.stateDir, this.workflowId);
    const statePath = join(workflowDir, "state.json");

    await fs.mkdir(workflowDir, { recursive: true });

    const stateData = this.toJSON();
    await fs.writeFile(statePath, JSON.stringify(stateData, null, 2), "utf-8");
  }
}
