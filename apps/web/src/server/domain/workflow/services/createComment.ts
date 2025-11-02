import { prisma } from '@/shared/prisma';
import type { CreateCommentInput } from '../types';
import type { WorkflowComment } from '@prisma/client';

/**
 * Create a comment on a workflow or step
 * Validates execution and step (if provided) exist
 * Returns null if execution not found, step not found, or step doesn't belong to execution
 */
export async function createComment(data: CreateCommentInput): Promise<WorkflowComment | null> {
  // Validate execution exists
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: data.workflow_execution_id },
  });

  if (!execution) {
    return null;
  }

  // If step_id provided, validate it exists and belongs to this execution
  if (data.workflow_execution_step_id) {
    const step = await prisma.workflowExecutionStep.findUnique({
      where: { id: data.workflow_execution_step_id },
    });

    if (!step) {
      return null;
    }

    if (step.workflow_execution_id !== data.workflow_execution_id) {
      return null;
    }
  }

  const comment = await prisma.workflowComment.create({
    data: {
      workflow_execution_id: data.workflow_execution_id,
      workflow_execution_step_id: data.workflow_execution_step_id,
      text: data.text,
      comment_type: data.comment_type || 'user',
      created_by: data.created_by,
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
  });

  return comment;
}
