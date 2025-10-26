/**
 * agent-cli-sdk - TypeScript SDK for AI CLI orchestration
 * @packageDocumentation
 */

// Adapters
export { ClaudeAdapter } from './adapters/claude';
export { CodexAdapter } from './adapters/codex';
export { CursorAdapter } from './adapters/cursor';
export { GeminiAdapter } from './adapters/gemini';

// Import adapters for use in getAdapter helper
import { ClaudeAdapter } from './adapters/claude';
import { CodexAdapter } from './adapters/codex';
import { CursorAdapter } from './adapters/cursor';
import { GeminiAdapter } from './adapters/gemini';

// Adapter types
export type {
  ClaudeOptions,
  ClaudeConfig,
  ClaudeStreamEvent,
} from './adapters/claude';

export type {
  CodexOptions,
  CodexConfig,
  CodexStreamEvent,
} from './adapters/codex';

export type {
  CursorConfig,
  CursorOptions,
} from './adapters/cursor';

export type {
  GeminiConfig,
  GeminiOptions,
} from './adapters/gemini';

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
} from './utils/types';

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
} from './utils/errors';

// JSON utilities
export {
  extractJSON,
  parseJSONL,
  safeJSONParse,
} from './utils/json-parser';

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
} from './adapters/claude/events';

export {
  isClaudeEvent,
  isFileHistorySnapshotEvent,
  isUserMessageEvent,
  isAssistantMessageEvent,
} from './adapters/claude/events';

// Codex event types and guards
export type {
  // Session meta types
  GitInfo,
  SessionMetaPayload,
  SessionMetaEvent,
  // Response item types
  InputTextContent,
  OutputTextContent,
  MessageContent,
  MessagePayload,
  SummaryTextContent,
  ReasoningPayload,
  FunctionCallPayload,
  FunctionCallOutputPayload,
  CustomToolCallPayload,
  CustomToolCallOutputPayload,
  ResponseItemPayload,
  ResponseItemEvent,
  // Event message types
  UserMessageEventPayload,
  AgentMessageEventPayload,
  AgentReasoningEventPayload,
  TokenUsageInfo,
  RateLimit,
  RateLimits,
  TokenInfo,
  TokenCountEventPayload,
  EventMsgPayload,
  EventMsgEvent,
  // Turn context types
  SandboxPolicy,
  TurnContextPayload,
  TurnContextEvent,
} from './adapters/codex/events';

export {
  // Event type guards
  isSessionMetaEvent,
  isResponseItemEvent,
  isEventMsgEvent,
  isTurnContextEvent,
  // Response item payload guards
  isMessagePayload,
  isReasoningPayload,
  isFunctionCallPayload,
  isFunctionCallOutputPayload,
  isCustomToolCallPayload,
  isCustomToolCallOutputPayload,
  // Event message payload guards
  isUserMessageEventPayload,
  isAgentMessageEventPayload,
  isAgentReasoningEventPayload,
  isTokenCountEventPayload,
} from './adapters/codex/events';

/**
 * Helper function to get an adapter instance by name
 * @param agent - Adapter name ('claude', 'codex', 'cursor', 'gemini')
 * @param config - Adapter configuration
 * @returns Adapter instance
 */
export function getAdapter(
  agent: 'claude',
  config?: import('./adapters/claude').ClaudeConfig
): import('./adapters/claude').ClaudeAdapter;
export function getAdapter(
  agent: 'codex',
  config?: import('./adapters/codex').CodexConfig
): import('./adapters/codex').CodexAdapter;
export function getAdapter(
  agent: 'cursor',
  config?: import('./adapters/cursor').CursorConfig
): import('./adapters/cursor').CursorAdapter;
export function getAdapter(
  agent: 'gemini',
  config?: import('./adapters/gemini').GeminiConfig
): import('./adapters/gemini').GeminiAdapter;
export function getAdapter(
  agent: 'claude' | 'codex' | 'cursor' | 'gemini',
  config?: unknown
): unknown {
  switch (agent) {
    case 'claude':
      return new ClaudeAdapter(
        config as import('./adapters/claude').ClaudeConfig | undefined
      );
    case 'codex':
      return new CodexAdapter(
        config as import('./adapters/codex').CodexConfig | undefined
      );
    case 'cursor':
      return new CursorAdapter(
        config as import('./adapters/cursor').CursorConfig | undefined
      );
    case 'gemini':
      return new GeminiAdapter(
        config as import('./adapters/gemini').GeminiConfig | undefined
      );
    default: {
      const exhaustiveCheck: never = agent;
      throw new Error(`Unknown agent: ${String(exhaustiveCheck)}`);
    }
  }
}

// Version
export const version = '4.0.0';
