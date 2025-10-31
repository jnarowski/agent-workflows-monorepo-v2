import { execute } from "@repo/agent-cli-sdk";
import type {
  AgentStrategy,
  AgentExecuteParams,
  AgentExecuteResult,
} from "./AgentStrategy";

/**
 * Strategy implementation for OpenAI Codex agent
 */
export class CodexAgentStrategy implements AgentStrategy {
  readonly name = "codex";

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
        tool: "codex",
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

      logger?.info(
        {
          sessionId,
          success: result.success,
          exitCode: result.exitCode,
        },
        "[WebSocket] Message execution completed"
      );

      return result;
    } catch (err: unknown) {
      logger?.error({ err, sessionId }, "Agent CLI SDK error");

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
    return agent === "codex";
  }
}
