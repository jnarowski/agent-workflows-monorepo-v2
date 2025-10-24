/**
 * Claude Code CLI event types
 * Based on Claude Code CLI output format
 */

import type { BaseStreamEvent } from './base';

/**
 * File history snapshot data
 */
export interface FileHistorySnapshotData {
  messageId: string;
  snapshot: {
    messageId: string;
    trackedFileBackups: Record<string, {
      backupFileName: string;
      version: number;
      backupTime: string;
    }>;
    timestamp: string;
  };
  isSnapshotUpdate: boolean;
}

/**
 * File history snapshot event
 */
export interface FileHistorySnapshotEvent extends BaseStreamEvent<'file-history-snapshot', FileHistorySnapshotData> {
  type: 'file-history-snapshot';
}

/**
 * Thinking metadata
 */
export interface ThinkingMetadata {
  level?: 'high' | 'medium' | 'low';
  disabled?: boolean;
  triggers?: string[];
}

/**
 * Message content types
 */
export type MessageContent =
  | TextContent
  | ThinkingContent
  | ToolUseContent
  | ToolResultContent;

/**
 * Text content block
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Thinking content block (Claude's internal reasoning)
 */
export interface ThinkingContent {
  type: 'thinking';
  thinking: string;
  signature?: string;
}

/**
 * Tool use content block
 */
export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result content block
 */
export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

/**
 * Token usage statistics
 */
export interface ClaudeTokenUsage {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
  output_tokens?: number;
  service_tier?: string;
}

/**
 * Claude message structure
 */
export interface ClaudeMessage {
  model?: string;
  id?: string;
  type?: 'message';
  role: 'user' | 'assistant';
  content: MessageContent[] | string;
  stop_reason?: string | null;
  stop_sequence?: string | null;
  usage?: ClaudeTokenUsage;
}

/**
 * Tool use result metadata
 */
export interface ToolUseResult {
  type?: string;
  filenames?: string[];
  durationMs?: number;
  numFiles?: number;
  truncated?: boolean;
  file?: {
    filePath: string;
    content: string;
    numLines: number;
    startLine: number;
    totalLines: number;
  };
  filePath?: string;
  oldString?: string;
  newString?: string;
  originalFile?: string;
  structuredPatch?: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }>;
  userModified?: boolean;
  replaceAll?: boolean;
}

/**
 * User message event data
 */
export interface UserMessageData {
  parentUuid?: string | null;
  isSidechain?: boolean;
  userType?: 'external' | 'internal';
  cwd?: string;
  sessionId?: string;
  version?: string;
  gitBranch?: string;
  message: ClaudeMessage;
  isMeta?: boolean;
  uuid: string;
  timestamp: string;
  thinkingMetadata?: ThinkingMetadata;
  toolUseResult?: ToolUseResult;
}

/**
 * User message event
 */
export interface UserMessageEvent extends BaseStreamEvent<'user', UserMessageData> {
  type: 'user';
}

/**
 * Assistant message event data
 */
export interface AssistantMessageData {
  parentUuid?: string;
  isSidechain?: boolean;
  userType?: 'external' | 'internal';
  cwd?: string;
  sessionId?: string;
  version?: string;
  gitBranch?: string;
  message: ClaudeMessage;
  requestId?: string;
  uuid: string;
  timestamp: string;
}

/**
 * Assistant message event
 */
export interface AssistantMessageEvent extends BaseStreamEvent<'assistant', AssistantMessageData> {
  type: 'assistant';
}

/**
 * Union of all Claude Code event types
 */
export type ClaudeStreamEvent =
  | FileHistorySnapshotEvent
  | UserMessageEvent
  | AssistantMessageEvent;

/**
 * Type guard to check if an event is a Claude event
 */
export function isClaudeEvent(event: BaseStreamEvent): event is ClaudeStreamEvent {
  return event.type === 'file-history-snapshot'
    || event.type === 'user'
    || event.type === 'assistant';
}

/**
 * Type guard for file history snapshot events
 */
export function isFileHistorySnapshotEvent(event: BaseStreamEvent): event is FileHistorySnapshotEvent {
  return event.type === 'file-history-snapshot';
}

/**
 * Type guard for user message events
 */
export function isUserMessageEvent(event: BaseStreamEvent): event is UserMessageEvent {
  return event.type === 'user';
}

/**
 * Type guard for assistant message events
 */
export function isAssistantMessageEvent(event: BaseStreamEvent): event is AssistantMessageEvent {
  return event.type === 'assistant';
}
