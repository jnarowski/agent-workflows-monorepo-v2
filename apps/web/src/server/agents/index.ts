/**
 * Server Agent Registry
 *
 * Maps agent types to their server-side implementations.
 * Each agent provides a loadSession function that reads and parses
 * session data from the filesystem.
 */

import type { AgentType } from '@/shared/types/agent.types';
import type { SessionMessage } from '@/shared/types/message.types';
import { loadSession as loadClaudeSession } from './claude/loadSession';
import { loadSession as loadCodexSession } from './codex/loadSession';
import { loadSession as loadCursorSession } from './cursor/loadSession';
import { loadSession as loadGeminiSession } from './gemini/loadSession';

/**
 * Server agent interface
 */
export interface ServerAgent {
  loadSession: (sessionId: string, projectPath: string) => Promise<SessionMessage[]>;
}

/**
 * Server agent registry
 * Maps agent type to implementation
 */
export const serverAgents: Record<AgentType, ServerAgent> = {
  claude: {
    loadSession: loadClaudeSession,
  },
  codex: {
    loadSession: loadCodexSession,
  },
  cursor: {
    loadSession: loadCursorSession,
  },
  gemini: {
    loadSession: loadGeminiSession,
  },
};

/**
 * Get server agent implementation for a given agent type
 * @param agentType - The agent type
 * @returns ServerAgent implementation
 * @throws Error if agent type is not found
 */
export function getAgent(agentType: AgentType): ServerAgent {
  const agent = serverAgents[agentType];
  if (!agent) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }
  return agent;
}
