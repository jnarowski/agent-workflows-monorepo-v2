/**
 * Chat UI types aligned with agent-cli-sdk StreamEvent format
 * Based on Anthropic's Claude API message structure
 */

// Re-export StreamEvent from agent-cli-sdk for consistency
export type { StreamEvent } from '@repo/agent-cli-sdk';

// Re-export Claude CLI session types
export type {
  ClaudeSessionRow,
  ClaudeSessionData,
  ClaudeFileHistorySnapshotRow,
  ClaudeUserMessageRow,
  ClaudeAssistantMessageRow,
  ClaudeMessage,
  ClaudeContentBlock,
  ClaudeFileBackup,
  ClaudeFileHistorySnapshot,
  ClaudeThinkingMetadata,
  ClaudeToolUseResult,
} from './claude-session.types';

export {
  isFileHistorySnapshot,
  isUserMessage,
  isAssistantMessage,
} from './claude-session.types';

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Content block base type
 */
export interface ContentBlockBase {
  type: string;
}

/**
 * Text content block
 */
export interface TextBlock extends ContentBlockBase {
  type: 'text';
  text: string;
}

/**
 * Thinking/reasoning content block
 */
export interface ThinkingBlock extends ContentBlockBase {
  type: 'thinking';
  thinking: string;
}

/**
 * Tool use (function call) content block
 */
export interface ToolUseBlock extends ContentBlockBase {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result content block
 */
export interface ToolResultBlock extends ContentBlockBase {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Union type for all content blocks
 */
export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

/**
 * Session message structure
 * Content is always an array of ContentBlocks for consistent rendering
 */
export interface SessionMessage {
  id: string;
  role: MessageRole;
  content: ContentBlock[];
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
}

/**
 * Tool call with linked result (for rendering)
 */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

/**
 * Tool-specific input types
 */

export interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface WriteToolInput {
  file_path: string;
  content: string;
}

export interface ReadToolInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface BashToolInput {
  command: string;
  description?: string;
  timeout?: number;
}

export interface GlobToolInput {
  pattern: string;
  path?: string;
}

export interface GrepToolInput {
  pattern: string;
  path?: string;
  output_mode?: 'content' | 'files_with_matches' | 'count';
}
