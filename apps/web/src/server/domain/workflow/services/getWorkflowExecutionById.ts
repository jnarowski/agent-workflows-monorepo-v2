import { prisma } from '@/shared/prisma';
import type { WorkflowExecution } from '@prisma/client';

/**
 * Gets a single workflow execution by ID with all relations
 * Includes: steps (with agent sessions), comments, workflow_definition
 */
export async function getWorkflowExecutionById(id: string): Promise<WorkflowExecution | null> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id },
    include: {
      workflow_definition: true,
      steps: {
        include: {
          session: true, // Agent session relation
          artifacts: true,
          comments: true,
        },
        orderBy: { created_at: 'asc' },
      },
      comments: {
        include: {
          creator: {
            select: {
              id: true,
              email: true,
            },
          },
          artifacts: true,
        },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  return execution;
}
