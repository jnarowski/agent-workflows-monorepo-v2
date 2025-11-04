import type {
  WorkflowConfig,
  WorkflowContext,
  WorkflowFunction,
} from "../types/workflow";
import type { WorkflowRuntime } from "../runtime/adapter";

/**
 * Workflow definition with type marker for runtime detection
 */
export interface WorkflowDefinition {
  __type: "workflow";
  config: WorkflowConfig;
  fn: WorkflowFunction;
  /**
   * Create an Inngest function using the provided runtime adapter
   * This is called by the web app to hydrate the workflow with real implementations
   */
  createInngestFunction(runtime: WorkflowRuntime): any;
}

/**
 * Define a type-safe workflow with custom step methods
 *
 * @param config - Workflow configuration
 * @param fn - Workflow function to execute
 * @returns Workflow definition with createInngestFunction method
 *
 * @example
 * ```typescript
 * import { defineWorkflow } from '@sourceborn/workflow-sdk';
 *
 * export default defineWorkflow({
 *   id: 'implement-feature',
 *   trigger: 'workflow/implement-feature',
 *   phases: ['plan', 'implement', 'review', 'test']
 * }, async ({ event, step }) => {
 *   await step.phase('plan', async () => {
 *     await step.annotation('Planning phase started');
 *     await step.agent('analyze', {
 *       agent: 'claude',
 *       prompt: 'Analyze the requirements'
 *     });
 *   });
 *
 *   await step.phase('implement', async () => {
 *     await step.slash('/implement-spec', ['feature-name']);
 *   });
 *
 *   await step.phase('review', async () => {
 *     await step.git('create-pr', {
 *       operation: 'pr',
 *       title: 'Feature implementation',
 *       body: 'Implemented feature'
 *     });
 *   });
 * });
 * ```
 */
export function defineWorkflow(
  config: WorkflowConfig,
  fn: WorkflowFunction
): WorkflowDefinition {
  return {
    __type: "workflow",
    config,
    fn,
    createInngestFunction(runtime: WorkflowRuntime): any {
      // This will be called by the web app with the runtime adapter
      // The runtime adapter provides the actual implementations of step methods
      return runtime.createInngestFunction(config, fn);
    },
  };
}
