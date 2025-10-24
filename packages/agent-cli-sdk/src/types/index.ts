/**
 * Type exports for agent-cli-sdk
 */

// Core interfaces
export type {
  StreamEvent,
  OutputData,
  TokenUsage,
  ModelUsage,
  ActionLog,
  ValidationResult,
  AdapterCapabilities,
  ExecutionResponse,
  ExecutionOptions,
  AIAdapter,
} from './interfaces';

// Configuration types
export type {
  AgentClientOptions,
  AgentClientConfig,
  ExecuteOptions,
  SessionInfo,
  SessionOptions,
  SendOptions,
} from './config';

// Claude-specific types
export type {
  ImageInput,
  ClaudeConfig,
  ClaudeExecutionOptions,
  MCPServer,
  CLIDetectionResult,
} from './claude';

// Codex-specific types
export type { CodexConfig, CodexExecutionOptions } from './codex';

// Session types
export type { SessionEventType, SessionEventData, AdapterSession } from './session';

// Logging types
export type { ExecutionLog, LogPaths } from './logging';

// Event types (adapter-specific)
export type {
  // Base event types
  BaseStreamEvent,
  // Claude event types
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
  FileHistorySnapshotEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  ClaudeStreamEvent,
  // Codex event types
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
  // Union type
  AdapterStreamEvent,
} from './events';

// Event type guards
export {
  // Claude type guards
  isClaudeEvent,
  isFileHistorySnapshotEvent,
  isUserMessageEvent,
  isAssistantMessageEvent,
  // Codex type guards
  isCodexEvent,
  isThreadStartedEvent,
  isTurnCompletedEvent,
  isItemCompletedEvent,
  isToolStartedEvent,
  isFileWrittenEvent,
  isFileModifiedEvent,
} from './events';
