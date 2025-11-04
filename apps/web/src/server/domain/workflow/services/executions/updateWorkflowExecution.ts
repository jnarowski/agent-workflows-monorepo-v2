import { prisma } from '@/shared/prisma';
import type { WorkflowExecution, Prisma } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Update workflow execution fields
 * Supports partial updates (e.g., current_phase, status, error_message)
 * Includes WebSocket broadcasting for real-time updates
 */
export async function updateWorkflowExecution(
  executionId: string,
  data: Prisma.WorkflowExecutionUpdateInput,
  logger?: FastifyBaseLogger
): Promise<WorkflowExecution> {
  logger?.debug(
    { executionId, updates: Object.keys(data) },
    'Updating workflow execution'
  );

  const execution = await prisma.workflowExecution.update({
    where: { id: executionId },
    data,
  });

  logger?.debug({ executionId }, 'Workflow execution updated');

  // TODO: Add WebSocket broadcasting when event bus is available
  // eventBus.emit('workflow.execution.updated', { executionId, data });

  return execution;
}
