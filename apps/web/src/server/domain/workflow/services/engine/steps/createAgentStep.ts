import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";
import type { AgentStepConfig, AgentStepResult } from "@repo/workflow-sdk";
import type { AgentStepOptions } from "../../../types/event.types";
import { executeStep } from "./executeStep";
import { executeAgent } from "@/server/domain/session/services/executeAgent";
import { createSession } from "@/server/domain/session/services/createSession";
import { updateSession } from "@/server/domain/session/services/updateSession";
import { randomUUID } from "node:crypto";

const DEFAULT_AGENT_TIMEOUT = 1800000; // 30 minutes

/**
 * Create agent step factory function
 * Executes an AI agent with WebSocket streaming
 */
export function createAgentStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function agent(
    id: string,
    config: AgentStepConfig,
    options?: AgentStepOptions
  ): Promise<AgentStepResult> {
    const timeout = options?.timeout ?? DEFAULT_AGENT_TIMEOUT;
    const name = config.name ?? id;

    return executeStep(context, id, name, async () => {
      const { projectId, userId, logger } = context;

      // Create agent session using domain service
      const sessionId = randomUUID();
      const session = await createSession(
        projectId,
        userId,
        sessionId,
        config.agent,
        name,
        {} // Empty metadata for workflow sessions
      );

      try {
        // Execute agent with timeout
        const result = await Promise.race([
          executeAgent({
            sessionId: session.id,
            // @ts-ignore - agent type
            agent: config.agent,
            prompt: config.prompt,
            workingDir: config.projectPath ?? context.projectPath,
            logger,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`Agent execution timed out after ${timeout}ms`)
                ),
              timeout
            )
          ),
        ]);

        return {
          sessionId: session.id,
          success: true,
          // @ts-ignore - result properties
          output: result.output,
          // @ts-ignore - result properties
          steps: result.steps,
        };
      } catch (error) {
        // Mark session as failed using domain service
        await updateSession(
          session.id,
          {
            state: "error",
            error_message:
              error instanceof Error ? error.message : String(error),
          },
          // @ts-ignore - logger type
          logger
        );

        throw error;
      }
    }, inngestStep);
  };
}
