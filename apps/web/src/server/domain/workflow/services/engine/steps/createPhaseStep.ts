import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "../../../types/engine.types";
import type { PhaseOptions } from "@repo/workflow-sdk";
import { updateWorkflowExecution } from "../../executions/updateWorkflowExecution";
import { createWorkflowEvent } from "../../events/createWorkflowEvent";

/**
 * Create phase step factory function
 *
 * Phase step executes a workflow phase with automatic retry logic
 * - Updates WorkflowExecution.current_phase
 * - Retries on failure (default: 3 attempts)
 * - Creates phase events (started, completed, failed, retry)
 * - Broadcasts WebSocket events
 * - All nested steps tagged with phase name
 *
 * @param context - Runtime context (will be mutated to set currentPhase)
 * @returns Phase step function
 */
export function createPhaseStep(context: RuntimeContext) {
  return async function phase<T>(
    name: string,
    fn: () => Promise<T>,
    options?: PhaseOptions
  ): Promise<T> {
    const { executionId, projectId, logger } = context;
    const retries = options?.retries ?? 3;
    const retryDelay = options?.retryDelay ?? 5000;

    logger.info(
      { executionId, phase: name, retries, retryDelay },
      "Phase started"
    );

    // Update current_phase in execution using domain service
    await updateWorkflowExecution(
      executionId,
      { current_phase: name },
      logger
    );

    // Set current phase in context (for nested step tagging)
    context.currentPhase = name;

    // Create phase_started event using domain service
    await createWorkflowEvent({
      workflow_execution_id: executionId,
      event_type: "phase_started",
      event_data: {
        title: `Phase Started: ${name}`,
        body: `Starting phase "${name}" with ${retries} max retries`,
        phase: name,
        retries,
      },
      logger,
    });

    // Broadcast phase started
    broadcast(Channels.project(projectId), {
      type: "workflow:phase:started",
      data: {
        executionId,
        phase: name,
        timestamp: new Date().toISOString(),
      },
    });

    let lastError: Error | null = null;
    let attempt = 0;

    // Retry loop
    while (attempt <= retries) {
      try {
        // Execute phase function
        const result = await fn();

        // Success - create phase_completed event using domain service
        await createWorkflowEvent({
          workflow_execution_id: executionId,
          event_type: "phase_completed",
          event_data: {
            title: `Phase Completed: ${name}`,
            body: `Phase "${name}" completed successfully on attempt ${attempt + 1}/${retries + 1}`,
            phase: name,
          },
          logger,
        });

        // Broadcast phase completed
        broadcast(Channels.project(projectId), {
          type: "workflow:phase:completed",
          data: {
            executionId,
            phase: name,
            attempt: attempt + 1,
            timestamp: new Date().toISOString(),
          },
        });

        logger.info(
          { executionId, phase: name, attempt: attempt + 1 },
          "Phase completed"
        );

        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        logger.warn(
          {
            executionId,
            phase: name,
            attempt,
            maxRetries: retries,
            error: lastError.message,
          },
          "Phase attempt failed"
        );

        // If not last attempt, broadcast retry event and wait
        if (attempt <= retries) {
          // Create phase_retry event using domain service
          await createWorkflowEvent({
            workflow_execution_id: executionId,
            event_type: "phase_retry",
            event_data: {
              title: `Phase Retry: ${name}`,
              body: `Retrying phase "${name}" (attempt ${attempt}/${retries}) after error: ${lastError.message}`,
              phase: name,
              attempt,
              error: lastError.message,
            },
            logger,
          });

          broadcast(Channels.project(projectId), {
            type: "workflow:phase:retry",
            data: {
              executionId,
              phase: name,
              attempt,
              maxRetries: retries,
              error: lastError.message,
              timestamp: new Date().toISOString(),
            },
          });

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All retries exhausted - phase failed
    logger.error(
      {
        executionId,
        phase: name,
        attempts: attempt,
        error: lastError?.message,
      },
      "Phase failed after all retries"
    );

    // Create phase_failed event using domain service
    await createWorkflowEvent({
      workflow_execution_id: executionId,
      event_type: "phase_failed",
      event_data: {
        title: `Phase Failed: ${name}`,
        body: `Phase "${name}" failed after ${attempt} attempts. Error: ${lastError?.message || "Unknown error"}`,
        phase: name,
        attempts: attempt,
        error: lastError?.message,
      },
      logger,
    });

    broadcast(Channels.project(projectId), {
      type: "workflow:phase:failed",
      data: {
        executionId,
        phase: name,
        attempts: attempt,
        error: lastError?.message,
        timestamp: new Date().toISOString(),
      },
    });

    // Throw error to halt workflow
    throw lastError;
  };
}
