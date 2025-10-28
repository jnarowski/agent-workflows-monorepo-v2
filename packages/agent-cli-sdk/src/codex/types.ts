/**
 * Codex-specific types for parsing JSONL events.
 *
 * These types are INPUT-ONLY - they are used to parse incoming JSONL from Codex CLI
 * and type the `_original` field. All output should use UnifiedMessage types from types/unified.ts.
 */

// ============================================================================
// Top-Level Event Structure
// ============================================================================

export type CodexEvent =
  | ThreadStartedEvent
  | TurnStartedEvent
  | TurnCompletedEvent
  | TurnFailedEvent
  | ItemStartedEvent
  | ItemCompletedEvent
  | ErrorEvent;

export interface ThreadStartedEvent {
  type: 'thread.started';
  thread_id: string;
}

export interface TurnStartedEvent {
  type: 'turn.started';
}

export interface TurnCompletedEvent {
  type: 'turn.completed';
  usage?: {
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
  };
}

export interface TurnFailedEvent {
  type: 'turn.failed';
  error: {
    message: string;
  };
}

export interface ItemStartedEvent {
  type: 'item.started';
  item: CodexItem;
}

export interface ItemCompletedEvent {
  type: 'item.completed';
  item: CodexItem;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
}

export type CodexItem =
  | ReasoningItem
  | AgentMessageItem
  | CommandExecutionItem
  | FileChangeItem;

export interface ReasoningItem {
  id: string;
  type: 'reasoning';
  text: string;
}

export interface AgentMessageItem {
  id: string;
  type: 'agent_message';
  text: string;
}

export interface CommandExecutionItem {
  id: string;
  type: 'command_execution';
  command: string;
  aggregated_output: string;
  exit_code?: number;
  status: 'in_progress' | 'completed' | 'failed';
}

export interface FileChangeItem {
  id: string;
  type: 'file_change';
  changes: Array<{
    path: string;
    kind: 'add' | 'modify' | 'delete';
  }>;
  status: 'in_progress' | 'completed' | 'failed';
}

