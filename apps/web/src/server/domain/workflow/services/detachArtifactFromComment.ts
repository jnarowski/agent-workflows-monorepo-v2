import { prisma } from '@/shared/prisma';
import type { WorkflowArtifact } from '@prisma/client';

/**
 * Detach an artifact from a comment
 * Sets artifact.workflow_comment_id to null
 */
export async function detachArtifactFromComment(artifactId: string): Promise<WorkflowArtifact> {
  const artifact = await prisma.workflowArtifact.update({
    where: { id: artifactId },
    data: {
      workflow_comment_id: null,
    },
  });

  return artifact;
}
