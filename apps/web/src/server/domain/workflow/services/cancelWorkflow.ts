import { prisma } from '@/shared/prisma';
import type { WorkflowExecution } from '@prisma/client';

/**
 * Cancels a workflow execution
 * Updates status to 'cancelled' and sets cancelled_at timestamp
 */
export async function cancelWorkflow(executionId: string): Promise<WorkflowExecution> {
  const execution = await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'cancelled',
      cancelled_at: new Date(),
    },
  });

  return execution;
}
