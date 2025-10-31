import type { PermissionMode } from "@repo/agent-cli-sdk";
import type { FastifyBaseLogger } from "fastify";

export interface AgentExecuteParams {
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
 * Strategy interface for agent execution
 * Each agent (Claude, Codex, etc.) implements this interface
 */
export interface AgentStrategy {
  /** Name of the agent (e.g., "claude", "codex") */
  readonly name: string;

  /**
   * Execute agent with given parameters
   * @param params - Agent execution parameters
   * @returns Promise resolving to execution result
   */
  execute(params: AgentExecuteParams): Promise<AgentExecuteResult>;

  /**
   * Check if this strategy supports the given agent name
   * @param agent - Agent name to check
   * @returns True if this strategy can handle the agent
   */
  isSupported(agent: string): boolean;
}
