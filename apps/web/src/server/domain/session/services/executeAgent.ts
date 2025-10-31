import type { PermissionMode } from "@repo/agent-cli-sdk";
import type { FastifyBaseLogger } from "fastify";
import { AgentStrategyRegistry } from "@/server/strategies/agents/AgentStrategyRegistry.js";

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
 * Execute agent command using strategy pattern
 * Delegates execution to the appropriate agent strategy
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

  try {
    // Get the appropriate strategy for the agent
    const strategy = AgentStrategyRegistry.get(agent);

    // Execute using the strategy
    return await strategy.execute({
      prompt,
      workingDir,
      sessionId,
      resume,
      permissionMode,
      model,
      images,
      onEvent,
      logger,
    });
  } catch (err: unknown) {
    logger?.error({ err, sessionId, agent }, "Agent execution failed");

    const errorMessage =
      err instanceof Error ? err.message : "Failed to execute agent command";

    return {
      success: false,
      exitCode: 1,
      error: errorMessage,
    };
  }
}
