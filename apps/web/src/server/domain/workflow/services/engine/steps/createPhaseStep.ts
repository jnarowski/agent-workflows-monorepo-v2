import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "../../../types/engine.types";
import { updateWorkflowExecution } from "../../executions/updateWorkflowExecution";
import { findOrCreateWorkflowEvent } from "../../events/findOrCreateWorkflowEvent";

/**
 * Create phase step factory function
 *
 * Phase step executes a workflow phase WITHOUT Inngest step.run() wrapper
 * - Phases are organizational containers, not memoized steps
 * - Updates WorkflowExecution.current_phase
 * - Creates phase events (started, completed, failed) with consistent step IDs for deduplication
 * - Broadcasts WebSocket events
 * - All nested steps tagged with phase name
 * - Relies on Inngest function-level retries
 *
 * @param context - Runtime context (will be mutated to set currentPhase)
 * @returns Phase step function
 */
export function createPhaseStep(context: RuntimeContext) {
  return async function phase<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const { executionId, projectId, logger } = context;

    // Generate consistent step ID for phase lifecycle events (for deduplication on replay)
    const phaseStepId = `phase-${name}-lifecycle`;

    logger.info({ executionId, phase: name }, "Phase started");

    // Update current_phase in execution using domain service
    await updateWorkflowExecution(
      executionId,
      { current_phase: name },
      logger
    );

    // Set current phase in context (for nested step tagging)
    context.currentPhase = name;

    // Create phase_started event with step ID for idempotency
    await findOrCreateWorkflowEvent({
      workflow_execution_id: executionId,
      event_type: "phase_started",
      event_data: {
        title: `Phase Started: ${name}`,
        body: `Starting phase "${name}"`,
        phase: name,
      },
      phase: name,
      inngest_step_id: phaseStepId,
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

    try {
      // Execute phase function (Inngest handles retries at function level)
      const result = await fn();

      // Success - create phase_completed event with step ID
      await findOrCreateWorkflowEvent({
        workflow_execution_id: executionId,
        event_type: "phase_completed",
        event_data: {
          title: `Phase Completed: ${name}`,
          body: `Phase "${name}" completed successfully`,
          phase: name,
        },
        phase: name,
        inngest_step_id: phaseStepId,
        logger,
      });

      // Broadcast phase completed
      broadcast(Channels.project(projectId), {
        type: "workflow:phase:completed",
        data: {
          executionId,
          phase: name,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info({ executionId, phase: name }, "Phase completed");

      return result;
    } catch (error) {
      const err = error as Error;

      logger.error(
        { executionId, phase: name, error: err.message },
        "Phase failed"
      );

      // Create phase_failed event with step ID
      await findOrCreateWorkflowEvent({
        workflow_execution_id: executionId,
        event_type: "phase_failed",
        event_data: {
          title: `Phase Failed: ${name}`,
          body: `Phase "${name}" failed. Error: ${err.message}`,
          phase: name,
          attempts: 1,
          error: err.message,
        },
        phase: name,
        inngest_step_id: phaseStepId,
        logger,
      });

      broadcast(Channels.project(projectId), {
        type: "workflow:phase:failed",
        data: {
          executionId,
          phase: name,
          error: err.message,
          timestamp: new Date().toISOString(),
        },
      });

      // Throw error - Inngest will handle retry at function level
      throw error;
    }
  };
}
