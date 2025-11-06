import type { WorkflowConfig, WorkflowFunction, PhaseDefinition } from "../types/workflow";

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
  createInngestFunction<
    TPhases extends readonly PhaseDefinition[] | undefined,
    TArgs = Record<string, unknown>
  >(
    config: WorkflowConfig<TPhases, TArgs>,
    fn: WorkflowFunction<TPhases, TArgs>
  ): any;
}
