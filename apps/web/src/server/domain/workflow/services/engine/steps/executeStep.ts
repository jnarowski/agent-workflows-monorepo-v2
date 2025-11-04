import type { RuntimeContext } from "../../../types/engine.types";
import { findOrCreateStep } from "./findOrCreateStep";
import { updateStepStatus } from "./updateStepStatus";
import { handleStepFailure } from "./handleStepFailure";

/**
 * Execute a step function with automatic status tracking
 *
 * @param context - Runtime context
 * @param stepName - Step name
 * @param fn - Step function to execute
 * @returns Step result
 */
export async function executeStep<T>(
  context: RuntimeContext,
  stepName: string,
  fn: () => Promise<T>
): Promise<T> {
  // Find or create step
  const step = await findOrCreateStep(context, stepName);

  // Update to running
  await updateStepStatus(context, step.id, "running");

  try {
    // Execute step function
    const result = await fn();

    // Update to completed
    await updateStepStatus(
      context,
      step.id,
      "completed",
      result as Record<string, unknown>
    );

    return result;
  } catch (error) {
    // Handle failure
    await handleStepFailure(context, step.id, error as Error);
    throw error;
  }
}
