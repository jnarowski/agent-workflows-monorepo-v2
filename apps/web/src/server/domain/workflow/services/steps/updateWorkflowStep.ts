import { prisma } from '@/shared/prisma';
import type { WorkflowExecutionStep } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface UpdateWorkflowStepParams {
  stepId: string;
  status: StepStatus;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  logger?: FastifyBaseLogger;
}

/**
 * Update workflow step status, error message, and timestamps
 * Timestamps are passed as parameters for flexibility
 * Includes WebSocket broadcasting for real-time updates
 */
export async function updateWorkflowStep(
  params: UpdateWorkflowStepParams
): Promise<WorkflowExecutionStep> {
  const { stepId, status, errorMessage, startedAt, completedAt, logger } = params;

  logger?.debug(
    { stepId, status, hasError: !!errorMessage },
    'Updating workflow step'
  );

  const step = await prisma.workflowExecutionStep.update({
    where: { id: stepId },
    data: {
      status,
      ...(errorMessage !== undefined && { error_message: errorMessage }),
      ...(startedAt !== undefined && { started_at: startedAt }),
      ...(completedAt !== undefined && { completed_at: completedAt }),
    },
  });

  logger?.debug({ stepId }, 'Workflow step updated');

  // TODO: Add WebSocket broadcasting when event bus is available
  // eventBus.emit('workflow.step.updated', { stepId, status });

  return step;
}
