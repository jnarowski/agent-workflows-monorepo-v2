import { execute, type PermissionMode } from "@repo/agent-cli-sdk";
import type { FastifyBaseLogger } from "fastify";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions.js";

export interface AgentExecuteConfig {
  agent: "claude" | "codex";
  prompt: string;
  workingDir: string;
  sessionId: string;
  resume?: boolean;
  permissionMode?: PermissionMode;
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
 * Execute agent command via agent-cli-sdk
 * Directly calls the SDK execute function for the specified agent
 */
export async function executeAgent(
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
    // Execute via agent-cli-sdk
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

    // Store process reference if available (Claude only)
    if ("process" in result && result.process) {
      logger?.debug(
        { sessionId, pid: result.process.pid },
        "Storing process reference for session"
      );
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
    logger?.error({ err, sessionId, agent }, "Agent CLI SDK error");

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
