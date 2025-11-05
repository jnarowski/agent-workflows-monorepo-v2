import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";

/**
 * Create generic run step factory function
 * Wraps Inngest's native step.run() directly with phase prefixing
 */
export function createRunStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function run<T>(
    id: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    // Generate phase-prefixed Inngest step ID
    const inngestStepId = context.currentPhase
      ? `${context.currentPhase}-${id}`
      : id;

    return (await inngestStep.run(inngestStepId, fn)) as unknown as Promise<T>;
  };
}
