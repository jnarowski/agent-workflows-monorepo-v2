import { prisma } from '@/shared/prisma';
import type { WorkflowExecutionStep } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Create a new workflow execution step
 * Includes WebSocket broadcasting for real-time updates
 */
export async function createWorkflowStep(
  executionId: string,
  inngestStepId: string,
  stepName: string,
  phase?: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowExecutionStep> {
  logger?.debug(
    { executionId, inngestStepId, stepName, phase },
    'Creating workflow step'
  );

  const step = await prisma.workflowExecutionStep.create({
    data: {
      workflow_execution_id: executionId,
      inngest_step_id: inngestStepId,
      name: stepName,
      status: 'pending',
      phase: phase || '',
    },
  });

  logger?.debug({ stepId: step.id }, 'Workflow step created');

  // TODO: Add WebSocket broadcasting when event bus is available
  // eventBus.emit('workflow.step.created', { stepId: step.id, executionId });

  return step;
}
