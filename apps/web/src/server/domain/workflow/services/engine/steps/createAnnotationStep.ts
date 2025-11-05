import type { GetStepTools } from "inngest";
import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "../../../types/engine.types";
import { createWorkflowEvent } from "../../events/createWorkflowEvent";

/**
 * Create annotation step factory function
 * Adds progress notes/annotations to workflow timeline
 * Uses Inngest step.run() for idempotency (no duplicates on replay)
 */
export function createAnnotationStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function annotation(message: string): Promise<void> {
    const { executionId, projectId, currentPhase, logger } = context;

    // Generate deterministic step ID from message content
    // Use first 32 chars of base64-encoded message for uniqueness
    const stepId = `annotation-${Buffer.from(message).toString("base64").slice(0, 32)}`;

    // Wrap in Inngest step.run for memoization
    return await inngestStep.run(stepId, async () => {
      // Create annotation event using domain service
      const event = await createWorkflowEvent({
        workflow_execution_id: executionId,
        event_type: "annotation_added",
        event_data: {
          title: "Annotation Added",
          body: message,
          message,
        },
        phase: currentPhase,
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
    }) as unknown as Promise<void>;
  };
}
