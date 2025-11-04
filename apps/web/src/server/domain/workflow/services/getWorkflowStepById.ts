import { prisma } from '@/shared/prisma';
import type { WorkflowExecutionStep } from '@prisma/client';

/**
 * Get a workflow execution step by ID
 * Includes: agent session, artifacts, events
 */
export async function getWorkflowStepById(id: string): Promise<WorkflowExecutionStep | null> {
  const step = await prisma.workflowExecutionStep.findUnique({
    where: { id },
    include: {
      session: true, // Agent session if present
      artifacts: true,
      events: {
        include: {
          created_by_user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  return step;
}
