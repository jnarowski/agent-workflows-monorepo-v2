import { prisma } from "@/shared/prisma";
import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "../../types";
import type { PhaseOptions } from "@sourceborn/workflow-sdk";

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

    logger.info({ executionId, phase: name, retries, retryDelay }, "Phase started");

    // Update current_phase in execution
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { current_phase: name },
    });

    // Set current phase in context (for nested step tagging)
    context.currentPhase = name;

    // Create phase_started event
    await prisma.workflowEvent.create({
      data: {
        workflow_execution_id: executionId,
        event_type: "phase_started",
        event_data: { phase: name, retries, retryDelay },
      },
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

        // Success - create phase_completed event
        await prisma.workflowEvent.create({
          data: {
            workflow_execution_id: executionId,
            event_type: "phase_completed",
            event_data: { phase: name, attempt: attempt + 1, totalAttempts: retries + 1 },
          },
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

        logger.info({ executionId, phase: name, attempt: attempt + 1 }, "Phase completed");

        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        logger.warn(
          { executionId, phase: name, attempt, maxRetries: retries, error: lastError.message },
          "Phase attempt failed"
        );

        // If not last attempt, broadcast retry event and wait
        if (attempt <= retries) {
          await prisma.workflowEvent.create({
            data: {
              workflow_execution_id: executionId,
              event_type: "phase_retry",
              event_data: {
                phase: name,
                attempt,
                maxRetries: retries,
                error: lastError.message,
                retryDelay,
              },
            },
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
      { executionId, phase: name, attempts: attempt, error: lastError?.message },
      "Phase failed after all retries"
    );

    await prisma.workflowEvent.create({
      data: {
        workflow_execution_id: executionId,
        event_type: "phase_failed",
        event_data: {
          phase: name,
          attempts: attempt,
          error: lastError?.message,
        },
      },
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
