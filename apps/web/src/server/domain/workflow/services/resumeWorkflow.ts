import { prisma } from '@/shared/prisma';
import type { WorkflowExecution } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { createWorkflowEvent } from './createWorkflowEvent';
import { broadcast } from '@/server/websocket/infrastructure/subscriptions';
import { WorkflowEventTypes } from '@/shared/types/websocket.types';
import { Channels } from '@/shared/websocket';

/**
 * STUB: Resume a paused workflow execution (future implementation)
 * Currently just updates status to 'running'
 * Logs warning that resume not implemented
 */
export async function resumeWorkflow(
  executionId: string,
  userId?: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowExecution> {
  logger?.warn({ executionId }, 'Resume workflow not implemented - stubbed');

  const resumedAt = new Date();
  const execution = await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'running',
      paused_at: null, // Clear paused_at when resuming
    },
  });

  // Create workflow_resumed event
  await createWorkflowEvent({
    workflow_execution_id: executionId,
    event_type: 'workflow_resumed',
    event_data: {
      title: 'Resumed',
    },
    created_by_user_id: userId,
    created_at: resumedAt,
    logger
  });

  // Emit WebSocket event immediately for real-time updates
  broadcast(Channels.project(execution.project_id), {
    type: WorkflowEventTypes.RESUMED,
    data: {
      executionId: execution.id,
      projectId: execution.project_id,
      timestamp: resumedAt.toISOString(),
    },
  });

  // Future: Resume execution from checkpoint
  return execution;
}
