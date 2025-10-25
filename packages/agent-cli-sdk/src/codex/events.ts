/**
 * Codex CLI event types
 * Based on Codex CLI 0.46.0+ event format
 */

/**
 * Base stream event (adapter-specific)
 */
interface BaseStreamEvent {
  type: string;
  timestamp?: number;
  data?: unknown;
}

/**
 * Token usage information
 */
export interface CodexUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

/**
 * Thread started event data
 */
export interface ThreadStartedData {
  thread_id: string;
  timestamp?: number;
}

/**
 * Thread started event
 */
export interface ThreadStartedEvent extends BaseStreamEvent {
  type: 'thread.started';
  data?: ThreadStartedData;
}

/**
 * Turn completed event data
 */
export interface TurnCompletedData {
  turn_id?: string;
  usage?: CodexUsage;
  timestamp?: number;
}

/**
 * Turn completed event
 */
export interface TurnCompletedEvent extends BaseStreamEvent {
  type: 'turn.completed';
  data?: TurnCompletedData;
}

/**
 * Item types in Codex
 */
export type CodexItemType = 'agent_message' | 'user_message' | 'tool_call' | 'tool_result';

/**
 * Codex item structure
 */
export interface CodexItem {
  type: CodexItemType;
  id?: string;
  text?: string;
  content?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Item completed event data
 */
export interface ItemCompletedData {
  item: CodexItem;
  timestamp?: number;
}

/**
 * Item completed event (messages, tool calls, etc.)
 */
export interface ItemCompletedEvent extends BaseStreamEvent {
  type: 'item.completed';
  data?: ItemCompletedData;
}

/**
 * Tool started event data
 */
export interface ToolStartedData {
  toolName?: string;
  name?: string;
  input?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Tool started event
 */
export interface ToolStartedEvent extends BaseStreamEvent {
  type: 'tool.started';
  data?: ToolStartedData;
}

/**
 * Tool use event data (alternative format)
 */
export interface ToolUseData {
  toolName?: string;
  name?: string;
  input?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Tool use event
 */
export interface ToolUseEvent extends BaseStreamEvent {
  type: 'tool_use';
  data?: ToolUseData;
}

/**
 * File written event data
 */
export interface FileWrittenData {
  path?: string;
  file?: string;
  content?: string;
  timestamp?: number;
}

/**
 * File written event
 */
export interface FileWrittenEvent extends BaseStreamEvent {
  type: 'file.written';
  data?: FileWrittenData;
}

/**
 * File modified event data
 */
export interface FileModifiedData {
  path?: string;
  file?: string;
  content?: string;
  timestamp?: number;
}

/**
 * File modified event
 */
export interface FileModifiedEvent extends BaseStreamEvent {
  type: 'file.modified';
  data?: FileModifiedData;
}

/**
 * Usage event data
 */
export interface UsageEventData {
  usage: CodexUsage;
  timestamp?: number;
}

/**
 * Usage event
 */
export interface UsageEvent extends BaseStreamEvent {
  type: 'usage';
  data?: UsageEventData;
}

/**
 * Completion event data
 */
export interface CompletionEventData {
  usage?: CodexUsage;
  result?: unknown;
  timestamp?: number;
}

/**
 * Completion event
 */
export interface CompletionEvent extends BaseStreamEvent {
  type: 'completion';
  data?: CompletionEventData;
}

/**
 * Union of all Codex event types
 */
export type CodexStreamEvent =
  | ThreadStartedEvent
  | TurnCompletedEvent
  | ItemCompletedEvent
  | ToolStartedEvent
  | ToolUseEvent
  | FileWrittenEvent
  | FileModifiedEvent
  | UsageEvent
  | CompletionEvent;

/**
 * Type guard to check if an event is a Codex event
 */
export function isCodexEvent(event: BaseStreamEvent): event is CodexStreamEvent {
  return event.type === 'thread.started'
    || event.type === 'turn.completed'
    || event.type === 'item.completed'
    || event.type === 'tool.started'
    || event.type === 'tool_use'
    || event.type === 'file.written'
    || event.type === 'file.modified'
    || event.type === 'usage'
    || event.type === 'completion';
}

/**
 * Type guard for thread started events
 */
export function isThreadStartedEvent(event: BaseStreamEvent): event is ThreadStartedEvent {
  return event.type === 'thread.started';
}

/**
 * Type guard for turn completed events
 */
export function isTurnCompletedEvent(event: BaseStreamEvent): event is TurnCompletedEvent {
  return event.type === 'turn.completed';
}

/**
 * Type guard for item completed events
 */
export function isItemCompletedEvent(event: BaseStreamEvent): event is ItemCompletedEvent {
  return event.type === 'item.completed';
}

/**
 * Type guard for tool started events
 */
export function isToolStartedEvent(event: BaseStreamEvent): event is ToolStartedEvent {
  return event.type === 'tool.started';
}

/**
 * Type guard for file written events
 */
export function isFileWrittenEvent(event: BaseStreamEvent): event is FileWrittenEvent {
  return event.type === 'file.written';
}

/**
 * Type guard for file modified events
 */
export function isFileModifiedEvent(event: BaseStreamEvent): event is FileModifiedEvent {
  return event.type === 'file.modified';
}
