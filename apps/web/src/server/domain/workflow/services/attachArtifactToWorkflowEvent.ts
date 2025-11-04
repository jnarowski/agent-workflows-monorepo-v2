import { prisma } from '@/shared/prisma';
import type { WorkflowArtifact } from '@prisma/client';

/**
 * Attach an artifact to an event
 * Validates event exists and belongs to same execution
 * Returns null if artifact not found, event not found, or event doesn't belong to same execution
 */
export async function attachArtifactToWorkflowEvent(
  artifactId: string,
  eventId: string
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

  // Get event to validate it exists and belongs to same execution
  const event = await prisma.workflowEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return null;
  }

  // Validate event belongs to same execution
  if (event.workflow_execution_id !== artifact.step.workflow_execution_id) {
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
