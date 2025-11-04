import { prisma } from "@/shared/prisma";
import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "../../types";

/**
 * Create annotation step factory function
 * Adds progress notes/annotations to workflow timeline
 */
export function createAnnotationStep(context: RuntimeContext) {
  return async function annotation(message: string): Promise<void> {
    const { executionId, projectId, currentPhase, logger } = context;

    // Create annotation event
    const event = await prisma.workflowEvent.create({
      data: {
        workflow_execution_id: executionId,
        event_type: "annotation_added",
        event_data: {
          message,
          phase: currentPhase,
        },
      },
    });

    // Broadcast annotation
    broadcast(Channels.project(projectId), {
      type: "workflow:annotation:created",
      data: {
        executionId,
        message,
        phase: currentPhase,
        timestamp: event.created_at.toISOString(),
      },
    });

    logger.debug({ executionId, message, phase: currentPhase }, "Annotation added");
  };
}
