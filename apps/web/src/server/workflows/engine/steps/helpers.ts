import { prisma } from "@/shared/prisma";
import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { createWorkflowEvent } from "@/server/domain/workflow/services";
import type { RuntimeContext } from "../../types";
import type { WorkflowExecutionStep } from "@prisma/client";

/**
 * Find existing or create new workflow execution step
 * Steps are created dynamically as workflow executes
 *
 * @param context - Runtime context
 * @param stepName - Step name
 * @returns WorkflowExecutionStep record
 */
export async function findOrCreateStep(
  context: RuntimeContext,
  stepName: string
): Promise<WorkflowExecutionStep> {
  const { executionId, currentPhase, logger } = context;

  // Try to find existing step
  let step = await prisma.workflowExecutionStep.findFirst({
    where: {
      workflow_execution_id: executionId,
      name: stepName,
      phase: currentPhase,
    },
  });

  // Create if doesn't exist
  if (!step) {
    logger.debug(
      { executionId, stepName, phase: currentPhase },
      "Creating new workflow step"
    );

    step = await prisma.workflowExecutionStep.create({
      data: {
        workflow_execution_id: executionId,
        step_id: stepName, // Use step name as step_id
        name: stepName,
        status: "pending",
        phase: currentPhase,
      },
    });
  }

  return step;
}

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

  // Update step
  const step = await prisma.workflowExecutionStep.update({
    where: { id: stepId },
    data: {
      status,
      error_message: error,
      started_at: status === "running" ? new Date() : undefined,
      completed_at: status === "completed" || status === "failed" ? new Date() : undefined,
    },
  });

  // Create event
  let eventType:
    | "step_started"
    | "step_completed"
    | "step_failed"
    | "step_running" = "step_running";
  if (status === "running") eventType = "step_started";
  else if (status === "completed") eventType = "step_completed";
  else if (status === "failed") eventType = "step_failed";

  await createWorkflowEvent({
    workflow_execution_id: executionId,
    event_type: eventType,
    event_data: {
      stepId,
      stepName: step.name,
      phase: step.phase,
      status,
      error,
    },
    logger,
  });

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

/**
 * Handle step failure with cleanup
 *
 * @param context - Runtime context
 * @param stepId - Step ID
 * @param error - Error that occurred
 */
export async function handleStepFailure(
  context: RuntimeContext,
  stepId: string,
  error: Error
): Promise<void> {
  const { logger } = context;

  logger.error(
    { executionId: context.executionId, stepId, error: error.message },
    "Step failed"
  );

  await updateStepStatus(context, stepId, "failed", undefined, error.message);
}

/**
 * Execute a step function with automatic status tracking
 *
 * @param context - Runtime context
 * @param stepName - Step name
 * @param fn - Step function to execute
 * @returns Step result
 */
export async function executeStep<T>(
  context: RuntimeContext,
  stepName: string,
  fn: () => Promise<T>
): Promise<T> {
  // Find or create step
  const step = await findOrCreateStep(context, stepName);

  // Update to running
  await updateStepStatus(context, step.id, "running");

  try {
    // Execute step function
    const result = await fn();

    // Update to completed
    await updateStepStatus(
      context,
      step.id,
      "completed",
      result as Record<string, unknown>
    );

    return result;
  } catch (error) {
    // Handle failure
    await handleStepFailure(context, step.id, error as Error);
    throw error;
  }
}
