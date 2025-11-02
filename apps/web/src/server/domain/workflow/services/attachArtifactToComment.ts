import { prisma } from '@/shared/prisma';
import type { WorkflowArtifact } from '@prisma/client';

/**
 * Attach an artifact to a comment
 * Validates comment exists and belongs to same execution
 * Returns null if artifact not found, comment not found, or comment doesn't belong to same execution
 */
export async function attachArtifactToComment(
  artifactId: string,
  commentId: string
): Promise<WorkflowArtifact | null> {
  // Get artifact with execution info
  const artifact = await prisma.workflowArtifact.findUnique({
    where: { id: artifactId },
    include: {
      step: true,
    },
  });

  if (!artifact) {
    return null;
  }

  // Get comment to validate it exists and belongs to same execution
  const comment = await prisma.workflowComment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return null;
  }

  // Validate comment belongs to same execution
  if (comment.workflow_execution_id !== artifact.step.workflow_execution_id) {
    return null;
  }

  // Update artifact to attach to comment
  const updatedArtifact = await prisma.workflowArtifact.update({
    where: { id: artifactId },
    data: {
      workflow_comment_id: commentId,
    },
  });

  return updatedArtifact;
}
