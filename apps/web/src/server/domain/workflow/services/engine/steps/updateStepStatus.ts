import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { createWorkflowEvent } from "@/server/domain/workflow/services";
import type { RuntimeContext } from "../../../types/engine.types";
import { updateWorkflowStep } from "../../steps/updateWorkflowStep";

/**
 * Update workflow execution step status and create event
 *
 * @param context - Runtime context
 * @param stepId - Step ID
 * @param status - New status
 * @param result - Optional result data
 * @param error - Optional error message
 */
export async function updateStepStatus(
  context: RuntimeContext,
  stepId: string,
  status: "pending" | "running" | "completed" | "failed",
  result?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const { executionId, projectId, logger } = context;

  // Update step using domain service
  const step = await updateWorkflowStep({
    stepId,
    status,
    errorMessage: error,
    startedAt: status === "running" ? new Date() : undefined,
    completedAt:
      status === "completed" || status === "failed" ? new Date() : undefined,
    logger,
  });

  // Create event only for failed steps (skip step_started and step_completed)
  if (status === "failed") {
    const eventData = {
      title: `Step Failed: ${step.name}`,
      body: `Step "${step.name}" failed${error ? `: ${error}` : ""}`,
      stepId,
      error,
    };

    await createWorkflowEvent({
      workflow_execution_id: executionId,
      event_type: "step_failed",
      event_data: eventData,
      phase: step.phase,
      logger,
    });
  }

  // Broadcast WebSocket event
  const wsEventType =
    status === "running"
      ? "workflow:step:started"
      : status === "completed"
        ? "workflow:step:completed"
        : status === "failed"
          ? "workflow:step:failed"
          : "workflow:step:updated";

  broadcast(Channels.project(projectId), {
    type: wsEventType,
    data: {
      executionId,
      stepId,
      stepName: step.name,
      phase: step.phase,
      status,
      result,
      error,
      timestamp: new Date().toISOString(),
    },
  });

  logger.info(
    { executionId, stepId, stepName: step.name, status, phase: step.phase },
    `Step ${status}`
  );
}
