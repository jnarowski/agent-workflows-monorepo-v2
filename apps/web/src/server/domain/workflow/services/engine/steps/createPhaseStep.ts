import type { GetStepTools } from "inngest";
import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "../../../types/engine.types";
import type { PhaseOptions } from "@repo/workflow-sdk";
import { updateWorkflowExecution } from "../../executions/updateWorkflowExecution";
import { createWorkflowEvent } from "../../events/createWorkflowEvent";

/**
 * Create phase step factory function
 *
 * Phase step executes a workflow phase with Inngest memoization
 * - Updates WorkflowExecution.current_phase
 * - Creates phase events (started, completed, failed)
 * - Broadcasts WebSocket events
 * - All nested steps tagged with phase name
 * - Uses Inngest step.run() for memoization/idempotency
 * - Relies on Inngest function-level retries (no manual retry loop)
 *
 * @param context - Runtime context (will be mutated to set currentPhase)
 * @param inngestStep - Inngest step instance for memoization
 * @returns Phase step function
 */
export function createPhaseStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function phase<T>(
    name: string,
    fn: () => Promise<T>,
    _options?: PhaseOptions // Ignored - retries handled by Inngest
  ): Promise<T> {
    const { executionId, projectId, logger } = context;

    // Wrap entire phase in Inngest step.run for idempotency
    // This ensures phase only executes once, even if Inngest replays the workflow
    return (await inngestStep.run(`phase-${name}`, async () => {
      logger.info({ executionId, phase: name }, "Phase started");

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
          body: `Starting phase "${name}"`,
          phase: name,
        },
        phase: name,
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

        // Success - create phase_completed event using domain service
        await createWorkflowEvent({
          workflow_execution_id: executionId,
          event_type: "phase_completed",
          event_data: {
            title: `Phase Completed: ${name}`,
            body: `Phase "${name}" completed successfully`,
            phase: name,
          },
          phase: name,
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

        // Create phase_failed event using domain service
        await createWorkflowEvent({
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
    })) as unknown as Promise<T>; // End inngestStep.run()
  };
}
