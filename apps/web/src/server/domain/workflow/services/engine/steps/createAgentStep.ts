import type { RuntimeContext } from "../../../types/engine.types";
import type { AgentStepConfig, AgentStepResult } from "@repo/workflow-sdk";
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
export function createAgentStep(context: RuntimeContext) {
  return async function agent(
    name: string,
    config: AgentStepConfig,
    options?: { timeout?: number }
  ): Promise<AgentStepResult> {
    const timeout = options?.timeout ?? DEFAULT_AGENT_TIMEOUT;

    return executeStep(context, name, async () => {
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
          output: result.output,
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
          logger
        );

        throw error;
      }
    });
  };
}
