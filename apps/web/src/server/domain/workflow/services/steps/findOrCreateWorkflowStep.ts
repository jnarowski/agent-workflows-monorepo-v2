import type { WorkflowExecutionStep } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { findWorkflowStepByName } from './findWorkflowStepByName';
import { createWorkflowStep } from './createWorkflowStep';

/**
 * Find existing workflow step or create new one if not found
 * Convenience function that combines findWorkflowStepByName + createWorkflowStep
 */
export async function findOrCreateWorkflowStep(
  executionId: string,
  stepName: string,
  phase?: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowExecutionStep> {
  // Try to find existing step
  let step = await findWorkflowStepByName(executionId, stepName, phase, logger);

  // Create if not found
  if (!step) {
    logger?.debug(
      { executionId, stepName, phase },
      'Step not found, creating new step'
    );
    step = await createWorkflowStep(executionId, stepName, phase, logger);
  }

  return step;
}
