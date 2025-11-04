import type { Inngest, InngestFunction, GetStepTools } from "inngest";
import type { WorkflowRuntime, WorkflowConfig, WorkflowFunction, WorkflowStep } from "@sourceborn/workflow-sdk";
import type { RuntimeContext } from "../types";
import type { FastifyBaseLogger } from "fastify";
import {
  createPhaseStep,
  createAgentStep,
  createSlashStep,
  createGitStep,
  createCliStep,
  createArtifactStep,
  createAnnotationStep,
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
      return inngest.createFunction(
        {
          id: config.id,
          name: config.name ?? config.id,
          ...(config.timeout && { timeout: config.timeout }),
        },
        { event: config.trigger },
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
            // Custom phase-based step methods
            phase: createPhaseStep(context),
            agent: createAgentStep(context),
            slash: createSlashStep(context),
            git: createGitStep(context),
            cli: createCliStep(context),
            artifact: createArtifactStep(context),
            annotation: createAnnotationStep(context),
          }) as WorkflowStep;

          // Call user's workflow function with enriched context
          return fn({
            event,
            step: extendedStep,
          });
        }
      );
    },
  };
}
