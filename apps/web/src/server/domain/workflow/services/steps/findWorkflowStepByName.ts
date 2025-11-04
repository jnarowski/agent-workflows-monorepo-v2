import { prisma } from '@/shared/prisma';
import type { WorkflowExecutionStep } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Find workflow execution step by execution ID, name, and optional phase
 * Returns null if not found
 */
export async function findWorkflowStepByName(
  executionId: string,
  stepName: string,
  phase?: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowExecutionStep | null> {
  logger?.debug(
    { executionId, stepName, phase },
    'Finding workflow step by name'
  );

  const step = await prisma.workflowExecutionStep.findFirst({
    where: {
      workflow_execution_id: executionId,
      name: stepName,
      ...(phase && { phase }),
    },
  });

  if (step) {
    logger?.debug({ stepId: step.id }, 'Workflow step found');
  } else {
    logger?.debug('Workflow step not found');
  }

  return step;
}
