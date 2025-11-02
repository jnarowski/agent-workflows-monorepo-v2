import { prisma } from '@/shared/prisma';
import type { WorkflowExecution } from '@prisma/client';

/**
 * Pauses a running workflow execution
 * Updates status to 'paused' and sets paused_at timestamp
 */
export async function pauseWorkflow(executionId: string): Promise<WorkflowExecution> {
  const execution = await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'paused',
      paused_at: new Date(),
    },
  });

  return execution;
}
