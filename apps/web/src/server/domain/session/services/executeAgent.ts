import { execute, type PermissionMode } from "@repo/agent-cli-sdk";
import type { FastifyBaseLogger } from "fastify";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import type { ChildProcess } from "node:child_process";

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
  onStart?: (process: ChildProcess) => void;
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
    // @ts-ignore - onStart optional callback
      onStart: (process) => {
        // Store process reference immediately when execution starts
        logger?.info(
          { sessionId, pid: process.pid },
          "Process started, storing reference for session"
        );
        activeSessions.setProcess(sessionId, process);
      },
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

    // Clear process reference after completion
    activeSessions.clearProcess(sessionId);

    // If session was cancelled, treat as success to avoid error handling
    const sessionData = activeSessions.get(sessionId);
    if (sessionData?.cancelled) {
      logger?.info({ sessionId }, "Session was cancelled, treating as success");
      return {
        ...result,
        success: true,
        error: undefined,
      };
    }

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
