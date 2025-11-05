import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";
import type { AgentStepConfig, AgentStepResult } from "@repo/workflow-sdk";
import type { AgentStepOptions } from "../../../types/event.types";
import { executeStep } from "./executeStep";
import { executeAgent } from "@/server/domain/session/services/executeAgent";
import { createSession } from "@/server/domain/session/services/createSession";
import { updateSession } from "@/server/domain/session/services/updateSession";
import { withTimeout } from "./utils/withTimeout";
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
        const result = await withTimeout(
          executeAgent({
            sessionId: session.id,
            agent: config.agent as "claude" | "codex",
            prompt: config.prompt,
            workingDir: config.projectPath ?? context.projectPath,
            logger,
          }),
          timeout,
          "Agent execution"
        );

        return {
          sessionId: session.id,
          success: result.success,
          exitCode: result.exitCode,
        };
      } catch (error) {
        // Mark session as failed using domain service
        await updateSession(
          session.id,
          {
            state: "error",
            error_message:
              error instanceof Error ? error.message : String(error),
          }
        );

        throw error;
      }
    }, inngestStep);
  };
}
