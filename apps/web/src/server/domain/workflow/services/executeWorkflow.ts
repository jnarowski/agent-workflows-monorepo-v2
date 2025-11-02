import { prisma } from '@/shared/prisma';

/**
 * STUB: Execute a workflow (future implementation)
 * Currently just updates status to 'pending' and sets started_at
 * Returns immediately - no actual execution
 */
export async function executeWorkflow(executionId: string): Promise<void> {
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'pending',
      started_at: new Date(),
    },
  });

  // Returns immediately - no actual execution
  // Future: This will spawn workflow engine and execute steps
}
