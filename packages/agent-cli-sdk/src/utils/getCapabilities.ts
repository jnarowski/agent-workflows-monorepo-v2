/**
 * Agent type representing supported AI CLI tools.
 */
export type AgentType = 'claude' | 'codex' | 'gemini' | 'cursor';

/**
 * Model information for an AI agent.
 */
export interface ModelInfo {
  /** Unique model identifier */
  id: string;
  /** Human-readable model name */
  name: string;
}

/**
 * Capability flags for each AI CLI tool.
 */
export interface AgentCapabilities {
  /** Whether the agent supports slash commands */
  supportsSlashCommands: boolean;
  /** Whether the agent supports model selection */
  supportsModels: boolean;
  /** Available models for this agent */
  models: ModelInfo[];
}

/**
 * Map of agent capabilities by agent type.
 */
const AGENT_CAPABILITIES_MAP: Record<AgentType, AgentCapabilities> = {
  claude: {
    supportsSlashCommands: true,
    supportsModels: true,
    models: [
      { id: 'claude-opus-4-20250514', name: 'Opus 4.1' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Sonnet 4.5' },
    ],
  },
  codex: {
    supportsSlashCommands: false,
    supportsModels: true,
    models: [
      { id: 'gpt-5-codex', name: 'GPT-5 Codex' },
      { id: 'gpt-5', name: 'GPT-5' },
    ],
  },
  cursor: {
    supportsSlashCommands: false,
    supportsModels: false,
    models: [],
  },
  gemini: {
    supportsSlashCommands: false,
    supportsModels: false,
    models: [],
  },
};

/**
 * Get capability flags for a specific AI CLI tool.
 *
 * @param agentName - The name of the AI CLI tool
 * @returns Capability flags for the specified tool
 *
 * @example
 * ```typescript
 * import { getCapabilities } from '@repo/agent-cli-sdk';
 *
 * const caps = getCapabilities('claude');
 * if (caps.supportsSlashCommands) {
 *   // Show slash command UI
 * }
 *
 * if (caps.supportsModels && caps.models.length > 0) {
 *   // Show model selector with available models
 * }
 * ```
 */
export function getCapabilities(agentName: AgentType): AgentCapabilities {
  return AGENT_CAPABILITIES_MAP[agentName];
}
