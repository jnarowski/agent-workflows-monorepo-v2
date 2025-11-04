import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../types";
import { executeStep } from "./helpers";

/**
 * Create generic run step factory function
 * Wraps Inngest's native step.run() to create step records in database
 * This ensures all workflow steps are tracked for progress calculation
 */
export function createRunStep(
  context: RuntimeContext,
  inngestStep: GetStepTools<any>
) {
  return async function run<T>(
    stepId: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    // Use executeStep to create step record and track status
    return executeStep(context, stepId, async () => {
      // Call Inngest's native step.run() for actual execution
      return await inngestStep.run(stepId, fn);
    });
  };
}
