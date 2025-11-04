import type { RuntimeContext } from "../../../types/engine.types";
import type { AgentStepConfig, AgentStepResult } from "@repo/workflow-sdk";
import { executeStep } from "./helpers";
import { executeAgent } from "@/server/domain/session/services/executeAgent";
import { prisma } from "@/shared/prisma";

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

      // Create agent session
      const session = await prisma.agentSession.create({
        data: {
          projectId,
          userId,
          agent: config.agent,
          state: "working",
          name,
          metadata: {},
        },
      });

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
        // Mark session as failed
        await prisma.agentSession.update({
          where: { id: session.id },
          data: {
            state: "error",
            error_message:
              error instanceof Error ? error.message : String(error),
          },
        });

        throw error;
      }
    });
  };
}
