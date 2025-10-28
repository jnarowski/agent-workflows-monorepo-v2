/**
 * Parses Codex JSONL events into UnifiedMessage format.
 *
 * Transforms Codex-specific structures (reasoning, agent_message, command_execution, file_change)
 * into Claude-compatible unified format (thinking, text, tool_use, tool_result).
 */

import type {
  UnifiedMessage,
  UnifiedContent,
  UnifiedToolUseBlock,
} from '../types/unified.js';
import type {
  CodexEvent,
  ItemCompletedEvent,
  ReasoningItem,
  AgentMessageItem,
  CommandExecutionItem,
  FileChangeItem,
} from './types.js';

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a single JSONL line from Codex CLI into UnifiedMessage format.
 *
 * @param jsonlLine - Raw JSONL string from Codex CLI
 * @returns UnifiedMessage if the line contains a message, null otherwise
 */
export function parse(jsonlLine: string): UnifiedMessage | null {
  try {
    const event: CodexEvent = JSON.parse(jsonlLine);

    // Only process item.completed events (these contain the actual content)
    if (event.type === 'item.completed') {
      return transformItemCompleted(event);
    }

    // All other events don't produce messages
    return null;
  } catch {
    // Silently skip invalid events
    return null;
  }
}

// ============================================================================
// Item Transformers
// ============================================================================

function transformItemCompleted(
  event: ItemCompletedEvent
): UnifiedMessage | null {
  const { item } = event;

  switch (item.type) {
    case 'reasoning':
      return transformReasoning(event, item);
    case 'agent_message':
      return transformAgentMessage(event, item);
    case 'command_execution':
      return transformCommandExecution(event, item);
    case 'file_change':
      return transformFileChange(event, item);
    default: {
      // Exhaustive check
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

function transformReasoning(
  event: ItemCompletedEvent,
  item: ReasoningItem
): UnifiedMessage {
  const content: UnifiedContent[] = [
    {
      type: 'thinking',
      thinking: item.text,
    },
  ];

  return {
    id: item.id,
    role: 'assistant',
    content,
    timestamp: Date.now(), // Codex doesn't provide timestamps in these events
    tool: 'codex',
    _original: event,
  };
}

function transformAgentMessage(
  event: ItemCompletedEvent,
  item: AgentMessageItem
): UnifiedMessage {
  const content: UnifiedContent[] = [
    {
      type: 'text',
      text: item.text,
    },
  ];

  return {
    id: item.id,
    role: 'assistant',
    content,
    timestamp: Date.now(),
    tool: 'codex',
    _original: event,
  };
}

function transformCommandExecution(
  event: ItemCompletedEvent,
  item: CommandExecutionItem
): UnifiedMessage {
  // Tool use for the command execution
  const toolUseContent: UnifiedContent = {
    type: 'tool_use',
    id: item.id,
    name: 'Bash',
    input: {
      command: item.command,
    },
  };

  // Tool result with the output
  const toolResultContent: UnifiedContent = {
    type: 'tool_result',
    tool_use_id: item.id,
    content: item.aggregated_output || '',
    is_error: item.exit_code !== 0,
  };

  // Return message with both tool use and result
  return {
    id: item.id,
    role: 'assistant',
    content: [toolUseContent, toolResultContent],
    timestamp: Date.now(),
    tool: 'codex',
    _original: event,
  };
}

function transformFileChange(
  event: ItemCompletedEvent,
  item: FileChangeItem
): UnifiedMessage {
  // Map file changes to tool uses
  const changes: UnifiedContent[] = item.changes
    .map(change => {
      switch (change.kind) {
        case 'add':
          return {
            type: 'tool_use' as const,
            id: `${item.id}_add_${simpleHash(change.path)}`,
            name: 'Write',
            input: {
              file_path: change.path,
            },
          } satisfies UnifiedToolUseBlock;
        case 'modify':
          return {
            type: 'tool_use' as const,
            id: `${item.id}_edit_${simpleHash(change.path)}`,
            name: 'Edit',
            input: {
              file_path: change.path,
            },
          } satisfies UnifiedToolUseBlock;
        case 'delete':
          return {
            type: 'tool_use' as const,
            id: `${item.id}_delete_${simpleHash(change.path)}`,
            name: 'Bash',
            input: {
              command: `rm ${change.path}`,
            },
          } satisfies UnifiedToolUseBlock;
        default: {
          const _exhaustive: never = change.kind;
          return _exhaustive;
        }
      }
    });

  return {
    id: item.id,
    role: 'assistant',
    content: changes,
    timestamp: Date.now(),
    tool: 'codex',
    _original: event,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple hash function for generating IDs.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
