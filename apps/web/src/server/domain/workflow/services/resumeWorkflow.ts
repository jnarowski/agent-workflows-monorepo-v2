import { prisma } from '@/shared/prisma';
import type { WorkflowExecution } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * STUB: Resume a paused workflow execution (future implementation)
 * Currently just updates status to 'running'
 * Logs warning that resume not implemented
 */
export async function resumeWorkflow(
  executionId: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowExecution> {
  logger?.warn({ executionId }, 'Resume workflow not implemented - stubbed');

  const execution = await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'running',
      paused_at: null, // Clear paused_at when resuming
    },
  });

  // Future: Resume execution from checkpoint
  return execution;
}
