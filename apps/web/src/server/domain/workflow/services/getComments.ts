import { prisma } from '@/shared/prisma';
import type { WorkflowComment } from '@prisma/client';

/**
 * Get comments for a workflow execution or specific step
 * Includes: creator, artifacts (attached to comment)
 * Orders by created_at asc
 */
export async function getComments(
  executionId: string,
  stepId?: string
): Promise<WorkflowComment[]> {
  const comments = await prisma.workflowComment.findMany({
    where: {
      workflow_execution_id: executionId,
      ...(stepId && { workflow_execution_step_id: stepId }),
    },
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
  });

  return comments;
}
