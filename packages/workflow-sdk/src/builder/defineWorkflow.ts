import type {
  WorkflowConfig,
  WorkflowContext,
  WorkflowFunction,
} from "../types/workflow";
import type { WorkflowRuntime } from "../runtime/adapter";

/**
 * Workflow definition with type marker for runtime detection
 */
export interface WorkflowDefinition<
  TPhases extends readonly import("../types/workflow").PhaseDefinition[] | undefined = undefined
> {
  __type: "workflow";
  config: WorkflowConfig<TPhases>;
  fn: WorkflowFunction<TPhases>;
  /**
   * Create an Inngest function using the provided runtime adapter
   * This is called by the web app to hydrate the workflow with real implementations
   */
  createInngestFunction(runtime: WorkflowRuntime): any;
}

/**
 * Define a type-safe workflow with custom step methods
 *
 * Uses const type parameters to automatically infer phase IDs from config.
 * argsSchema enables runtime validation of workflow arguments via JSON Schema.
 *
 * @param config - Workflow configuration
 * @param fn - Workflow function to execute
 * @returns Workflow definition with createInngestFunction method
 *
 * @example
 * ```typescript
 * import { defineWorkflow } from '@repo/workflow-sdk';
 *
 * // Define argument types
 * interface FeatureArgs {
 *   featureName: string;
 *   priority: 'high' | 'medium' | 'low';
 *   estimatedHours?: number;
 * }
 *
 * export default defineWorkflow({
 *   id: 'implement-feature',
 *   trigger: 'workflow/implement-feature',
 *   phases: [
 *     { id: 'plan', label: 'Plan' },
 *     { id: 'implement', label: 'Implement' },
 *     { id: 'review', label: 'Review' }
 *   ],
 *   argsSchema: {
 *     type: 'object',
 *     properties: {
 *       featureName: { type: 'string' },
 *       priority: { type: 'string', enum: ['high', 'medium', 'low'] },
 *       estimatedHours: { type: 'number' }
 *     },
 *     required: ['featureName', 'priority']
 *   }
 * }, async ({ event, step }) => {
 *   // Cast to your interface for type safety
 *   const args = event.data.args as FeatureArgs;
 *   const { featureName, priority } = args;
 *
 *   await step.phase('plan', async () => {
 *     await step.agent('analyze', {
 *       agent: 'claude',
 *       prompt: `Analyze ${featureName} (priority: ${priority})`
 *     });
 *   });
 * });
 * ```
 */
export function defineWorkflow<
  const TPhases extends readonly import("../types/workflow").PhaseDefinition[] | undefined
>(
  config: WorkflowConfig<TPhases>,
  fn: WorkflowFunction<TPhases>
): WorkflowDefinition<TPhases> {
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
