import { execute } from "@repo/agent-cli-sdk";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import type {
  AgentStrategy,
  AgentExecuteParams,
  AgentExecuteResult,
} from "./AgentStrategy";

/**
 * Strategy implementation for Claude Code agent
 */
export class ClaudeAgentStrategy implements AgentStrategy {
  readonly name = "claude";

  async execute(params: AgentExecuteParams): Promise<AgentExecuteResult> {
    const {
      prompt,
      workingDir,
      sessionId,
      resume,
      permissionMode,
      model,
      images,
      onEvent,
      logger,
    } = params;

    logger?.info(
      {
        agent: this.name,
        sessionId,
        model,
        messageLength: prompt.length,
      },
      "[WebSocket] Sending message to agent-cli-sdk"
    );

    try {
      const result = await execute({
        tool: "claude",
        prompt,
        workingDir,
        sessionId,
        resume,
        permissionMode,
        model,
        verbose: true,
        images,
        onEvent,
      });

      // Store process reference if available (only for Claude currently)
      if ("process" in result && result.process) {
        logger?.debug({ sessionId }, "Storing process reference for session");
        activeSessions.setProcess(sessionId, result.process);
      }

      logger?.info(
        {
          sessionId,
          success: result.success,
          exitCode: result.exitCode,
        },
        "[WebSocket] Message execution completed"
      );

      // Clear process reference after completion
      activeSessions.clearProcess(sessionId);

      return result;
    } catch (err: unknown) {
      logger?.error({ err, sessionId }, "Agent CLI SDK error");

      // Clear process reference on error
      activeSessions.clearProcess(sessionId);

      const errorMessage =
        err instanceof Error ? err.message : "Failed to execute agent command";

      return {
        success: false,
        exitCode: 1,
        error: errorMessage,
      };
    }
  }

  isSupported(agent: string): boolean {
    return agent === "claude";
  }
}
