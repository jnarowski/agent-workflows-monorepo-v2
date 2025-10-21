import type { WorkflowStateData } from "../types/workflow.js";

/**
 * Configuration for BaseStorage
 */
export interface BaseStorageConfig {
  workflowId: string;
}

/**
 * Abstract base class for all workflow storage implementations.
 * Defines the contract for workflow state management across different backends.
 */
export abstract class BaseStorage {
  protected workflowId: string;
  protected state: WorkflowStateData;

  constructor(config: BaseStorageConfig) {
    this.workflowId = config.workflowId;
    this.state = {
      workflowId: config.workflowId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      stepStatuses: {},
      steps: {},
    };
  }

  /**
   * Gets the workflow ID
   */
  getWorkflowId(): string {
    return this.workflowId;
  }

  /**
   * Gets the entire workflow state
   */
  abstract getState(): WorkflowStateData;

  /**
   * Sets workflow state (partial update)
   */
  abstract setState(state: Partial<WorkflowStateData>): Promise<void>;

  /**
   * Adds a failure entry to the workflow state
   */
  abstract addFailure(stepName: string, error: Error | string): Promise<void>;

  /**
   * Returns the workflow state as JSON
   */
  abstract toJSON(): WorkflowStateData;

  /**
   * Loads workflow state from the backend
   */
  abstract load(): Promise<void>;
}
