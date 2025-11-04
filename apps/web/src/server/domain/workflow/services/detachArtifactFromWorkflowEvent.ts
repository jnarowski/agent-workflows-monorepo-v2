import { prisma } from '@/shared/prisma';
import type { WorkflowArtifact } from '@prisma/client';

/**
 * Detach an artifact from an event
 * Sets artifact.workflow_event_id to null
 */
export async function detachArtifactFromWorkflowEvent(artifactId: string): Promise<WorkflowArtifact> {
  const artifact = await prisma.workflowArtifact.update({
    where: { id: artifactId },
    data: {
      workflow_event_id: null,
    },
  });

  return artifact;
}
