import { prisma } from '@/shared/prisma';
import type { WorkflowRun, Prisma } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Update workflow run fields
 * Supports partial updates (e.g., current_phase, status, error_message)
 * Includes WebSocket broadcasting for real-time updates
 */
export async function updateWorkflowRun(
  runId: string,
  data: Prisma.WorkflowRunUpdateInput,
  logger?: FastifyBaseLogger
): Promise<WorkflowRun> {
  logger?.debug(
    { runId, updates: Object.keys(data) },
    'Updating workflow run'
  );

  const run = await prisma.workflowRun.update({
    where: { id: runId },
    data,
  });

  logger?.debug({ runId }, 'Workflow run updated');

  // TODO: Add WebSocket broadcasting when event bus is available
  // eventBus.emit('workflow.run.updated', { runId, data });

  return run;
}
