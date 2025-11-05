import type { RuntimeContext } from "../../../types/engine.types";
import type { WorkflowExecutionStep } from "@prisma/client";
import { findOrCreateWorkflowStep } from "../../steps/findOrCreateWorkflowStep";

/**
 * Find existing or create new workflow execution step
 * Steps are created dynamically as workflow executes
 *
 * @param context - Runtime context
 * @param inngestStepId - Inngest step ID for memoization
 * @param stepName - Step display name
 * @returns WorkflowExecutionStep record
 */
export async function findOrCreateStep(
  context: RuntimeContext,
  inngestStepId: string,
  stepName: string
): Promise<WorkflowExecutionStep> {
  const { executionId, currentPhase, logger } = context;

  // Use domain service for find-or-create logic
  const step = await findOrCreateWorkflowStep(
    executionId,
    inngestStepId,
    stepName,
    currentPhase ?? undefined,
    logger
  );

  return step;
}
