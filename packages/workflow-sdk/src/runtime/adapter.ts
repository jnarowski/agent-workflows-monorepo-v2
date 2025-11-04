import type { WorkflowConfig, WorkflowFunction } from "../types/workflow";

/**
 * Runtime adapter interface implemented by the web app
 * This provides the actual implementations of workflow step methods
 */
export interface WorkflowRuntime {
  /**
   * Create an Inngest function with runtime-injected step implementations
   * @param config - Workflow configuration
   * @param fn - Workflow function
   * @returns Configured Inngest function ready for registration
   */
  createInngestFunction(
    config: WorkflowConfig,
    fn: WorkflowFunction
  ): any;
}
