import type { Inngest, InngestFunction, GetStepTools } from "inngest";
import type { WorkflowRuntime, WorkflowConfig, WorkflowFunction, WorkflowStep } from "@sourceborn/workflow-sdk";
import type { RuntimeContext } from "../types";
import type { FastifyBaseLogger } from "fastify";
import { prisma } from "@/shared/prisma";
import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { createWorkflowEvent } from "@/server/domain/workflow/services";
import {
  createPhaseStep,
  createAgentStep,
  createSlashStep,
  createGitStep,
  createCliStep,
  createArtifactStep,
  createAnnotationStep,
  createRunStep,
} from "./steps";

/**
 * Create workflow runtime adapter that implements the SDK interface
 * This provides real implementations of all step methods
 *
 * @param inngest - Inngest client instance
 * @param logger - Fastify logger
 * @returns WorkflowRuntime implementation
 */
export function createWorkflowRuntime(
  inngest: Inngest,
  logger: FastifyBaseLogger
): WorkflowRuntime {
  return {
    createInngestFunction(
      config: WorkflowConfig,
      fn: WorkflowFunction
    ): InngestFunction<any, any> {
      // Create Inngest function with custom step implementations
      // Using workflow/${id} convention to match event sender (Inngest convention)
      return inngest.createFunction(
        {
          id: config.id,
          name: config.name ?? config.id,
          ...(config.timeout && { timeout: config.timeout }),
        },
        { event: `workflow/${config.id}` },
        async ({ event, step: inngestStep }) => {
          // Extract runtime context from event data
          const { executionId, projectId, userId, projectPath } = event.data;

          // Create runtime context
          const context: RuntimeContext = {
            executionId,
            projectId,
            userId,
            currentPhase: null,
            logger,
            projectPath,
          };

          // Create extended step object with custom methods
          const extendedStep: WorkflowStep = Object.assign({}, inngestStep, {
            // Override native step.run to track in database
            run: createRunStep(context, inngestStep),
            // Custom phase-based step methods
            phase: createPhaseStep(context),
            agent: createAgentStep(context),
            slash: createSlashStep(context),
            git: createGitStep(context),
            cli: createCliStep(context),
            artifact: createArtifactStep(context),
            annotation: createAnnotationStep(context),
          }) as WorkflowStep;

          try {
            // Emit workflow:started event
            await prisma.workflowExecution.update({
              where: { id: executionId },
              data: { status: "running" },
            });

            await createWorkflowEvent({
              workflow_execution_id: executionId,
              event_type: "workflow_started",
              event_data: { timestamp: new Date().toISOString() },
              logger,
            });

            broadcast(Channels.project(projectId), {
              type: "workflow:started",
              data: {
                executionId,
                projectId,
                timestamp: new Date().toISOString(),
              },
            });

            logger.info({ executionId, projectId }, "Workflow started");

            // Call user's workflow function with enriched context
            const result = await fn({
              event,
              step: extendedStep,
            });

            // Emit workflow:completed event
            await prisma.workflowExecution.update({
              where: { id: executionId },
              data: {
                status: "completed",
                completed_at: new Date(),
              },
            });

            await createWorkflowEvent({
              workflow_execution_id: executionId,
              event_type: "workflow_completed",
              event_data: { timestamp: new Date().toISOString() },
              logger,
            });

            broadcast(Channels.project(projectId), {
              type: "workflow:completed",
              data: {
                executionId,
                projectId,
                timestamp: new Date().toISOString(),
              },
            });

            logger.info({ executionId, projectId }, "Workflow completed");

            return result;
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));

            // Emit workflow:failed event
            await prisma.workflowExecution.update({
              where: { id: executionId },
              data: {
                status: "failed",
                completed_at: new Date(),
                error_message: err.message,
              },
            });

            await createWorkflowEvent({
              workflow_execution_id: executionId,
              event_type: "workflow_failed",
              event_data: {
                error: err.message,
                timestamp: new Date().toISOString(),
              },
              logger,
            });

            broadcast(Channels.project(projectId), {
              type: "workflow:failed",
              data: {
                executionId,
                projectId,
                error: err.message,
                timestamp: new Date().toISOString(),
              },
            });

            logger.error(
              { executionId, projectId, error: err.message },
              "Workflow failed"
            );

            throw error;
          }
        }
      );
    },
  };
}
