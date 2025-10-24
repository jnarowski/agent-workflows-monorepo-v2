/**
 * Event types for agent-cli-sdk
 * Supports multiple CLI adapters (Claude Code, Codex, etc.)
 */

// Base types
export type { BaseStreamEvent, StreamEvent } from './base';

// Claude Code event types
export type {
  // Data structures
  FileHistorySnapshotData,
  ThinkingMetadata,
  MessageContent,
  TextContent,
  ThinkingContent,
  ToolUseContent,
  ToolResultContent,
  ClaudeTokenUsage,
  ClaudeMessage,
  ToolUseResult,
  UserMessageData,
  AssistantMessageData,
  // Event types
  FileHistorySnapshotEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  ClaudeStreamEvent,
} from './claude';

// Claude type guards
export {
  isClaudeEvent,
  isFileHistorySnapshotEvent,
  isUserMessageEvent,
  isAssistantMessageEvent,
} from './claude';

// Codex event types
export type {
  // Data structures
  CodexUsage,
  ThreadStartedData,
  TurnCompletedData,
  CodexItemType,
  CodexItem,
  ItemCompletedData,
  ToolStartedData,
  ToolUseData,
  FileWrittenData,
  FileModifiedData,
  UsageEventData,
  CompletionEventData,
  // Event types
  ThreadStartedEvent,
  TurnCompletedEvent,
  ItemCompletedEvent,
  ToolStartedEvent,
  ToolUseEvent,
  FileWrittenEvent,
  FileModifiedEvent,
  UsageEvent,
  CompletionEvent,
  CodexStreamEvent,
} from './codex';

// Codex type guards
export {
  isCodexEvent,
  isThreadStartedEvent,
  isTurnCompletedEvent,
  isItemCompletedEvent,
  isToolStartedEvent,
  isFileWrittenEvent,
  isFileModifiedEvent,
} from './codex';

// Union type for all supported adapters
import type { ClaudeStreamEvent } from './claude';
import type { CodexStreamEvent } from './codex';
import type { StreamEvent } from './base';

/**
 * Union of all adapter-specific stream events
 * Use this for type-safe event handling across multiple adapters
 */
export type AdapterStreamEvent = ClaudeStreamEvent | CodexStreamEvent | StreamEvent;
