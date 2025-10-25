/**
 * agent-cli-sdk - TypeScript SDK for AI CLI orchestration
 * @packageDocumentation
 */

// Adapters
export { ClaudeAdapter } from './claude';
export { CodexAdapter } from './codex';
export { CursorAdapter } from './cursor';
export { GeminiAdapter } from './gemini';

// Import adapters for use in getAdapter helper
import { ClaudeAdapter } from './claude';
import { CodexAdapter } from './codex';
import { CursorAdapter } from './cursor';
import { GeminiAdapter } from './gemini';

// Adapter types
export type {
  ClaudeOptions,
  ClaudeConfig,
  ClaudeStreamEvent,
} from './claude';

export type {
  CodexOptions,
  CodexConfig,
  CodexStreamEvent,
} from './codex';

export type {
  CursorConfig,
  CursorOptions,
} from './cursor';

export type {
  GeminiConfig,
  GeminiOptions,
} from './gemini';

// Shared types
export type {
  ExecutionOptions,
  ExecutionResponse,
  StreamEvent,
  OutputData,
  TokenUsage,
  ModelUsage,
  ActionLog,
  ValidationResult,
} from './shared/types';

// Errors
export {
  AgentSDKError,
  ValidationError,
  CLINotFoundError,
  AuthenticationError,
  ExecutionError,
  TimeoutError,
  ParseError,
  SessionError,
} from './shared/errors';

// JSON utilities
export {
  extractJSON,
  parseJSONL,
  safeJSONParse,
} from './shared/json-parser';

// Claude event types and guards
export type {
  FileHistorySnapshotData,
  FileHistorySnapshotEvent,
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
  UserMessageEvent,
  AssistantMessageData,
  AssistantMessageEvent,
} from './claude/events';

export {
  isClaudeEvent,
  isFileHistorySnapshotEvent,
  isUserMessageEvent,
  isAssistantMessageEvent,
} from './claude/events';

// Codex event types and guards
export type {
  CodexUsage,
  ThreadStartedData,
  ThreadStartedEvent,
  TurnCompletedData,
  TurnCompletedEvent,
  CodexItemType,
  CodexItem,
  ItemCompletedData,
  ItemCompletedEvent,
  ToolStartedData,
  ToolStartedEvent,
  ToolUseData,
  ToolUseEvent,
  FileWrittenData,
  FileWrittenEvent,
  FileModifiedData,
  FileModifiedEvent,
  UsageEventData,
  UsageEvent,
  CompletionEventData,
  CompletionEvent,
} from './codex/events';

export {
  isCodexEvent,
  isThreadStartedEvent,
  isTurnCompletedEvent,
  isItemCompletedEvent,
  isToolStartedEvent,
  isFileWrittenEvent,
  isFileModifiedEvent,
} from './codex/events';

/**
 * Helper function to get an adapter instance by name
 * @param agent - Adapter name ('claude', 'codex', 'cursor', 'gemini')
 * @param config - Adapter configuration
 * @returns Adapter instance
 */
export function getAdapter(
  agent: 'claude',
  config?: import('./claude').ClaudeConfig
): import('./claude').ClaudeAdapter;
export function getAdapter(
  agent: 'codex',
  config?: import('./codex').CodexConfig
): import('./codex').CodexAdapter;
export function getAdapter(
  agent: 'cursor',
  config?: import('./cursor').CursorConfig
): import('./cursor').CursorAdapter;
export function getAdapter(
  agent: 'gemini',
  config?: import('./gemini').GeminiConfig
): import('./gemini').GeminiAdapter;
export function getAdapter(
  agent: 'claude' | 'codex' | 'cursor' | 'gemini',
  config?: unknown
): unknown {
  switch (agent) {
    case 'claude':
      return new ClaudeAdapter(config);
    case 'codex':
      return new CodexAdapter(config);
    case 'cursor':
      return new CursorAdapter(config);
    case 'gemini':
      return new GeminiAdapter(config);
    default: {
      const exhaustiveCheck: never = agent;
      throw new Error(`Unknown agent: ${String(exhaustiveCheck)}`);
    }
  }
}

// Version
export const version = '4.0.0';
