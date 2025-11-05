import { prisma } from '@/shared/prisma';
import type { WorkflowArtifact } from '@prisma/client';

/**
 * Attach an artifact to an event
 * Validates event exists
 * Returns null if artifact not found or event not found
 */
export async function attachArtifactToWorkflowEvent(
  artifactId: string,
  eventId: string
): Promise<WorkflowArtifact | null> {
  // Get artifact
  const artifact = await prisma.workflowArtifact.findUnique({
    where: { id: artifactId },
  });

  if (!artifact) {
    return null;
  }

  // Get event to validate it exists
  const event = await prisma.workflowEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return null;
  }

  // Update artifact to attach to event
  const updatedArtifact = await prisma.workflowArtifact.update({
    where: { id: artifactId },
    data: {
      workflow_event_id: eventId,
    },
  });

  return updatedArtifact;
}
