import type {
  WorkflowConfig,
  WorkflowContext,
  WorkflowFunction,
  PhaseDefinition,
} from "../types/workflow";
import type { WorkflowRuntime } from "../runtime/adapter";

/**
 * Workflow definition with type marker for runtime detection
 */
export interface WorkflowDefinition<
  TPhases extends readonly PhaseDefinition[] | undefined = undefined
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
 * Define a type-safe workflow
 *
 * Pass args type as second generic for type safety.
 * argsSchema provides runtime validation.
 *
 * @param config - Workflow configuration
 * @param fn - Workflow function to execute
 * @returns Workflow definition with createInngestFunction method
 *
 * @example
 * ```typescript
 * import { defineWorkflow } from '@repo/workflow-sdk';
 *
 * interface FeatureArgs {
 *   featureName: string;
 *   priority: 'high' | 'medium' | 'low';
 * }
 *
 * export default defineWorkflow<typeof phases, FeatureArgs>({
 *   id: 'implement-feature',
 *   phases: [{ id: 'plan', label: 'Plan' }] as const,
 *   argsSchema: {
 *     type: 'object',
 *     properties: {
 *       featureName: { type: 'string' },
 *       priority: { enum: ['high', 'medium', 'low'] }
 *     },
 *     required: ['featureName', 'priority']
 *   }
 * }, async ({ event }) => {
 *   const { featureName, priority } = event.data.args; // Typed!
 * });
 * ```
 */
export function defineWorkflow<
  const TPhases extends readonly PhaseDefinition[] | undefined = undefined
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
