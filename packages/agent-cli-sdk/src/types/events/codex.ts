/**
 * Codex CLI event types
 * Based on Codex CLI 0.46.0+ event format
 */

import type { BaseStreamEvent } from './base';

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
export interface ThreadStartedEvent extends BaseStreamEvent<'thread.started', ThreadStartedData> {
  type: 'thread.started';
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
export interface TurnCompletedEvent extends BaseStreamEvent<'turn.completed', TurnCompletedData> {
  type: 'turn.completed';
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
export interface ItemCompletedEvent extends BaseStreamEvent<'item.completed', ItemCompletedData> {
  type: 'item.completed';
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
export interface ToolStartedEvent extends BaseStreamEvent<'tool.started', ToolStartedData> {
  type: 'tool.started';
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
export interface ToolUseEvent extends BaseStreamEvent<'tool_use', ToolUseData> {
  type: 'tool_use';
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
export interface FileWrittenEvent extends BaseStreamEvent<'file.written', FileWrittenData> {
  type: 'file.written';
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
export interface FileModifiedEvent extends BaseStreamEvent<'file.modified', FileModifiedData> {
  type: 'file.modified';
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
export interface UsageEvent extends BaseStreamEvent<'usage', UsageEventData> {
  type: 'usage';
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
export interface CompletionEvent extends BaseStreamEvent<'completion', CompletionEventData> {
  type: 'completion';
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
