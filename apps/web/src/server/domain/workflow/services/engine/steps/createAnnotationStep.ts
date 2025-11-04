import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "../../../types/engine.types";
import { createWorkflowEvent } from "../../events/createWorkflowEvent";

/**
 * Create annotation step factory function
 * Adds progress notes/annotations to workflow timeline
 */
export function createAnnotationStep(context: RuntimeContext) {
  return async function annotation(message: string): Promise<void> {
    const { executionId, projectId, currentPhase, logger } = context;

    // Create annotation event using domain service
    const event = await createWorkflowEvent({
      workflow_execution_id: executionId,
      event_type: "annotation_added",
      event_data: {
        message,
        phase: currentPhase,
      },
      logger,
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

    logger.debug(
      { executionId, message, phase: currentPhase },
      "Annotation added"
    );
  };
}
