import type { WorkflowStep } from "./steps";

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  /** Unique workflow identifier */
  id: string;
  /** Inngest event trigger name (e.g., "workflow/implement-feature") */
  trigger: string;
  /** Human-readable workflow name */
  name?: string;
  /** Workflow description */
  description?: string;
  /** Workflow phases (for UI organization) */
  phases?: string[];
  /** Global workflow timeout in milliseconds */
  timeout?: number;
}

/**
 * Workflow execution context passed to workflow function
 */
export interface WorkflowContext {
  /** Inngest event data */
  event: {
    name: string;
    data: WorkflowEventData;
  };
  /** Extended step interface with custom methods */
  step: WorkflowStep;
}

/**
 * Event data structure for workflow triggers
 */
export interface WorkflowEventData {
  /** Workflow execution ID */
  executionId: string;
  /** Project ID */
  projectId: string;
  /** User ID who triggered the workflow */
  userId: string;
  /** Project filesystem path */
  projectPath: string;
  /** Workflow arguments */
  args: Record<string, unknown>;
}

/**
 * Workflow function signature
 */
export type WorkflowFunction = (context: WorkflowContext) => Promise<unknown>;
