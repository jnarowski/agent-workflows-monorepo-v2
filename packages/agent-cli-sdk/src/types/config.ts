/**
 * Configuration types for agent-cli-sdk
 */

import type { AIAdapter } from './interfaces.js';

/**
 * Client configuration options
 */
export interface AgentClientOptions {
  // Adapter instance (use createClaudeAdapter() or createCodexAdapter())
  adapter: AIAdapter;

  // Shared configuration (applied to all executions if not overridden)
  workingDirectory?: string;
  verbose?: boolean;
  logPath?: string; // Base log path for all executions
}

/**
 * Internal client configuration
 */
export interface AgentClientConfig {
  workingDirectory?: string;
  verbose?: boolean;
  logPath?: string;
}

/**
 * Execution options for single prompts
 */
export interface ExecuteOptions {
  // Session management
  sessionId?: string; // Specific session ID to use
  resume?: boolean; // Resume existing session (requires sessionId)

  // Callbacks
  onOutput?: (data: import('./interfaces.js').OutputData) => void; // Enhanced output data
  onEvent?: (event: import('./interfaces.js').StreamEvent) => void; // Parsed JSONL events

  // Execution control
  workingDirectory?: string; // Override default cwd
  timeout?: number; // Timeout in ms
  streaming?: boolean; // Enable streaming (default: true if onEvent/onOutput provided)

  // Logging
  logPath?: string; // Log this execution to directory

  // Adapter-specific options (passed through to adapter)
  [key: string]: unknown;
}

/**
 * Session metadata
 */
export interface SessionInfo {
  sessionId: string;
  messageCount: number;
  startedAt: number;
  lastMessageAt?: number;
  adapter: string; // Adapter type name
}

/**
 * Session configuration options
 */
export interface SessionOptions {
  sessionId?: string; // Pre-set session ID (optional)
  logPath?: string; // Base log path (creates message-N subdirs)
  workingDirectory?: string;

  // Event callbacks
  onOutput?: (data: import('./interfaces.js').OutputData) => void;
  onEvent?: (event: import('./interfaces.js').StreamEvent) => void;

  // Adapter-specific options
  [key: string]: unknown;
}

/**
 * Send message options
 */
export interface SendOptions {
  logPath?: string; // Override session logPath for this message
  timeout?: number;

  // Adapter-specific overrides
  [key: string]: unknown;
}
