import { execute, type ClaudePermissionMode } from "@repo/agent-cli-sdk";
import type { FastifyBaseLogger } from "fastify";

export interface AgentExecuteConfig {
  agent: "claude" | "codex";
  prompt: string;
  workingDir: string;
  sessionId: string;
  resume?: boolean;
  permissionMode?: ClaudePermissionMode;
  model?: string;
  images?: { path: string }[];
  onEvent?: (data: { raw: string; event: unknown; message: unknown | null }) => void;
  logger?: FastifyBaseLogger;
}

export interface AgentExecuteResult {
  success: boolean;
  exitCode: number;
  error?: string;
  sessionId?: string;
  events?: unknown[];
}

/**
 * Execute agent command via CLI SDK
 * Wraps agent-cli-sdk execution with error handling and logging
 */
export async function executeAgentCommand(
  config: AgentExecuteConfig
): Promise<AgentExecuteResult> {
  const {
    agent,
    prompt,
    workingDir,
    sessionId,
    resume,
    permissionMode,
    model,
    images,
    onEvent,
    logger,
  } = config;

  logger?.info(
    {
      agent,
      sessionId,
      model,
      messageLength: prompt.length,
    },
    "[WebSocket] Sending message to agent-cli-sdk"
  );

  try {
    const result = await execute({
      tool: agent,
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
