/**
 * Client Agent Registry
 *
 * Maps agent types to their client-side implementations.
 * Each agent provides:
 * - transformMessages: Transform loaded messages from API
 * - transformStreaming: Transform WebSocket streaming data
 * - MessageRenderer: Component to render messages
 */

import type { AgentType } from '@/shared/types/agent.types';
import type { SessionMessage, ContentBlock } from '@/shared/types/message.types';

// Import Claude transforms
import { transformMessages as transformClaudeMessages } from './claude/transformMessages';
import { transformStreaming as transformClaudeStreaming } from './claude/transformStreaming';

// Import stub transforms
import { transformMessages as transformCodexMessages } from './codex/transformMessages';
import { transformStreaming as transformCodexStreaming } from './codex/transformStreaming';
import { transformMessages as transformCursorMessages } from './cursor/transformMessages';
import { transformStreaming as transformCursorStreaming } from './cursor/transformStreaming';
import { transformMessages as transformGeminiMessages } from './gemini/transformMessages';
import { transformStreaming as transformGeminiStreaming } from './gemini/transformStreaming';

// Import components
import { MessageRenderer as ClaudeMessageRenderer } from '@/client/components/chat/MessageRenderer';
import { UnimplementedAgentRenderer } from '@/client/components/session/UnimplementedAgentRenderer';

/**
 * Client agent interface
 */
export interface ClientAgent {
  transformMessages: (raw: unknown[]) => SessionMessage[];
  transformStreaming: (wsData: unknown) => ContentBlock[];
  MessageRenderer: React.ComponentType<{ messages: SessionMessage[] }>;
}

/**
 * Wrapper component for Claude MessageRenderer
 * Adapts array of messages to render each message
 */
function ClaudeMessageListRenderer({ messages }: { messages: SessionMessage[] }) {
  // Build tool results map for Claude renderer
  const toolResults = new Map<string, { content: string; is_error?: boolean }>();

  messages.forEach((msg) => {
    if (msg.role === 'assistant') {
      msg.content.forEach((block) => {
        if (block.type === 'tool_result') {
          toolResults.set(block.tool_use_id, {
            content: block.content || '',
            is_error: block.is_error,
          });
        }
      });
    }
  });

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <ClaudeMessageRenderer key={message.id} message={message} toolResults={toolResults} />
      ))}
    </div>
  );
}

/**
 * Wrapper components for unimplemented agents
 */
function CodexRenderer() {
  return <UnimplementedAgentRenderer agent="codex" />;
}

function CursorRenderer() {
  return <UnimplementedAgentRenderer agent="cursor" />;
}

function GeminiRenderer() {
  return <UnimplementedAgentRenderer agent="gemini" />;
}

/**
 * Client agent registry
 * Maps agent type to implementation
 */
export const clientAgents: Record<AgentType, ClientAgent> = {
  claude: {
    transformMessages: transformClaudeMessages,
    transformStreaming: transformClaudeStreaming,
    MessageRenderer: ClaudeMessageListRenderer,
  },
  codex: {
    transformMessages: transformCodexMessages,
    transformStreaming: transformCodexStreaming,
    MessageRenderer: CodexRenderer,
  },
  cursor: {
    transformMessages: transformCursorMessages,
    transformStreaming: transformCursorStreaming,
    MessageRenderer: CursorRenderer,
  },
  gemini: {
    transformMessages: transformGeminiMessages,
    transformStreaming: transformGeminiStreaming,
    MessageRenderer: GeminiRenderer,
  },
};

/**
 * Get client agent implementation for a given agent type
 * @param agentType - The agent type
 * @returns ClientAgent implementation
 * @throws Error if agent type is not found
 */
export function getAgent(agentType: AgentType): ClientAgent {
  const agent = clientAgents[agentType];
  if (!agent) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }
  return agent;
}
