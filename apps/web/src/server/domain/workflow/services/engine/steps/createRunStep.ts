import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";

/**
 * Create generic run step factory function
 * Wraps Inngest's native step.run() directly
 * This is a simple passthrough to inngest.step.run()
 */
export function createRunStep(
  _context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function run<T>(
    stepId: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    // Simple passthrough to inngest.step.run()
    return (await inngestStep.run(stepId, fn)) as unknown as Promise<T>;
  };
}
