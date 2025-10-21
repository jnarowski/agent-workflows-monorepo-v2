/**
 * agent-cli-sdk-three - TypeScript SDK for AI CLI orchestration
 * @packageDocumentation
 */

// Core exports
export { AgentClient } from './client/agent-client';
export { Session } from './client/session';

// Adapters
export { ClaudeAdapter } from './adapters/claude/index';
export { ClaudeSession } from './adapters/claude/session';
export { CodexAdapter } from './adapters/codex/index';

// Base classes
export { BaseAdapter } from './core/base-adapter';

// Factory functions
export { createClaudeAdapter, createCodexAdapter } from './factories/index';

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
} from './core/errors';

// Type exports
export type {
  // Core interfaces
  AIAdapter,
  AdapterCapabilities,
  ExecutionOptions,
  ExecutionResponse,
  StreamEvent,
  TokenUsage,
  ModelUsage,
  ActionLog,
  ValidationResult,
  // Client types
  AgentClientOptions,
  ExecuteOptions,
  SessionOptions,
  SendOptions,
  SessionInfo,
  // Claude-specific types
  ClaudeConfig,
  ClaudeExecutionOptions,
  ImageInput,
  MCPServer,
  CLIDetectionResult,
  // Codex-specific types
  CodexConfig,
  CodexExecutionOptions,
  // Session types
  SessionEventType,
  SessionEventData,
  // Logging types
  ExecutionLog,
  LogPaths,
} from './types';

// Utilities (selective export)
export {
  extractJSON,
  parseJSONL,
  safeJSONParse,
  sequential,
  parallel,
  retry,
  sleep,
} from './utils';

// Version
export const version = '0.1.19';
