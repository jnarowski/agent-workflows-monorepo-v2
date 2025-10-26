/**
 * Message Types
 *
 * Defines the structure of session messages and content blocks.
 * These types are shared across all agent types, with agent-specific
 * data stored in the metadata field.
 */

import type { ToolInput } from './tool.types';

/**
 * Base session message structure
 */
export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: ContentBlock[];
  timestamp: number;
  /** Agent-specific metadata (model, etc.) */
  metadata?: Record<string, unknown>;
  /** Token usage data for assistant messages */
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  /** Images attached to the message */
  images?: string[];
  /** Whether the message is currently streaming */
  isStreaming?: boolean;
  /** Whether the message represents an error */
  isError?: boolean;
}

/**
 * Content block types that can appear in a message
 */
export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock;

/**
 * Text content block
 */
export interface TextBlock {
  type: 'text';
  text: string;
}

/**
 * Thinking/reasoning block (for models with extended thinking)
 */
export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
}

/**
 * Tool use block (agent calling a tool)
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: ToolInput;
}

/**
 * Tool result block (result of tool execution)
 */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: string;
  is_error?: boolean;
}
