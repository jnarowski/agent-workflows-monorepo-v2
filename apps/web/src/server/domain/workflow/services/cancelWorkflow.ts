import { prisma } from '@/shared/prisma';
import type { WorkflowExecution } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { createWorkflowEvent } from './createWorkflowEvent';
import { eventBus } from '@/server/websocket/infrastructure/EventBus';
import { WorkflowEventTypes } from '@/shared/websocket/types';

/**
 * Cancels a workflow execution
 * Updates status to 'cancelled' and sets cancelled_at timestamp
 */
export async function cancelWorkflow(
  executionId: string,
  userId?: string,
  reason?: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowExecution> {
  const cancelledAt = new Date();
  const execution = await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'cancelled',
      cancelled_at: cancelledAt,
    },
  });

  // Create workflow_cancelled event
  await createWorkflowEvent({
    workflow_execution_id: executionId,
    event_type: 'workflow_cancelled',
    event_data: {
      title: 'Cancelled',
      reason
    },
    created_by_user_id: userId,
    created_at: cancelledAt,
    logger
  });

  // Emit WebSocket event immediately for real-time updates
  eventBus.emit(`project:${execution.project_id}`, {
    type: WorkflowEventTypes.CANCELLED,
    data: {
      executionId: execution.id,
      projectId: execution.project_id,
      timestamp: cancelledAt.toISOString(),
    },
  });

  return execution;
}
