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
  /** Agent-specific metadata (usage, model, etc.) */
  metadata?: Record<string, unknown>;
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
