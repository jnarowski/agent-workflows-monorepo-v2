/**
 * @repo/agent-cli-sdk-two
 *
 * TypeScript SDK for orchestrating AI-powered CLI tools
 */

import type { UnifiedMessage } from './types/unified';
import { loadSession as loadClaudeMessages } from './claude/loadSession';
import {
  execute as executeClaudeCommand,
  type ExecuteOptions as ClaudeExecuteOptions,
  type ExecuteResult as ClaudeExecuteResult,
} from './claude/execute';

/**
 * Options for loading messages from an AI CLI session.
 */
export interface LoadMessagesOptions {
  /** The AI CLI tool to use */
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  /** Unique identifier for the session */
  sessionId: string;
  /** Path to the project directory (defaults to current working directory) */
  projectPath?: string;
}

/**
 * Load messages from an AI CLI session history.
 *
 * Retrieves and parses all messages from a saved AI CLI session, converting them
 * into a unified message format that works across different AI tools.
 *
 * @param options - Configuration for loading the session
 * @returns Promise resolving to an array of unified messages
 *
 * @example
 * ```typescript
 * const messages = await loadMessages({
 *   tool: 'claude',
 *   sessionId: 'abc123',
 *   projectPath: '/path/to/project'
 * });
 *
 * console.log(`Loaded ${messages.length} messages`);
 * messages.forEach(msg => {
 *   console.log(`[${msg.role}]:`, msg.content);
 * });
 * ```
 */
export async function loadMessages(
  options: LoadMessagesOptions
): Promise<UnifiedMessage[]> {
  switch (options.tool) {
    case 'claude':
      return await loadClaudeMessages({
        sessionId: options.sessionId,
        projectPath: options.projectPath || process.cwd(),
      });
    case 'codex':
      throw new Error('Codex loader not yet implemented');
    case 'gemini':
      throw new Error('Gemini loader not yet implemented');
    case 'cursor':
      throw new Error('Cursor loader not yet implemented');
    default: {
      const _exhaustive: never = options.tool;
      throw new Error(`Unknown tool: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Options for executing an AI CLI command.
 */
export interface ExecuteOptions {
  /** The AI CLI tool to use */
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  /** The prompt/instruction to send to the AI */
  prompt: string;
  /** Working directory for the command (defaults to current directory) */
  workingDir?: string;
  /** Timeout in milliseconds (defaults to no timeout) */
  timeout?: number;
  /** Enable verbose output logging */
  verbose?: boolean;
  /** Automatically extract and parse JSON from the response */
  extractJSON?: boolean;
  /** Callback invoked for each message received */
  onMessage?: (message: UnifiedMessage) => void;
  /** Callback invoked for each event received */
  onEvent?: (event: unknown) => void;
}

/**
 * Execute an AI CLI command programmatically.
 *
 * Runs an AI CLI tool with the specified prompt and options, returning the complete
 * output along with all messages exchanged. Supports real-time callbacks and automatic
 * JSON extraction from responses.
 *
 * @param options - Configuration for executing the command
 * @returns Promise resolving to the execution result with output, messages, and optional extracted JSON
 *
 * @example
 * ```typescript
 * // Basic execution
 * const result = await execute({
 *   tool: 'claude',
 *   prompt: 'List all TypeScript files in the src directory',
 *   workingDir: '/path/to/project'
 * });
 * console.log('Output:', result.output);
 *
 * // With callbacks and JSON extraction
 * const result = await execute<{ files: string[] }>({
 *   tool: 'claude',
 *   prompt: 'List all TS files and return as JSON array',
 *   extractJSON: true,
 *   onMessage: (msg) => console.log('Message:', msg),
 *   verbose: true
 * });
 * if (result.extractedJSON) {
 *   console.log('Files:', result.extractedJSON.files);
 * }
 * ```
 */
export async function execute<T = unknown>(
  options: ExecuteOptions,
): Promise<ClaudeExecuteResult<T>> {
  switch (options.tool) {
    case 'claude':
      return await executeClaudeCommand<T>(options as ClaudeExecuteOptions);
    case 'codex':
      throw new Error('Codex execute not yet implemented');
    case 'gemini':
      throw new Error('Gemini execute not yet implemented');
    case 'cursor':
      throw new Error('Cursor execute not yet implemented');
    default: {
      const _exhaustive: never = options.tool;
      throw new Error(`Unknown tool: ${String(_exhaustive)}`);
    }
  }
}

export * from './types/unified';
export * from './claude/types';
export { extractTextContent } from './types/unified';

// Re-export utilities
export { extractJSON } from './utils/extractJson';
export { detectCli } from './claude/detectCli';
