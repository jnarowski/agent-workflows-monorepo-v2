/**
 * Claude-specific types
 */

import type { ExecutionOptions } from './interfaces';

/**
 * Image input for Claude
 */
export interface ImageInput {
  path: string;
  mimeType?: string;
}

/**
 * Claude-specific configuration
 */
export interface ClaudeConfig {
  cliPath?: string;
  workingDir?: string;
  verbose?: boolean;
  apiKey?: string;
  oauthToken?: string;
}

/**
 * Claude-specific execution options
 */
export interface ClaudeExecutionOptions extends ExecutionOptions {
  model?: 'opus' | 'sonnet' | 'haiku';
  dangerouslySkipPermissions?: boolean;
  permissionMode?: 'default' | 'plan' | 'acceptEdits' | 'reject';
  toolSettings?: {
    allowedTools?: string[];
    disallowedTools?: string[];
  };
  images?: ImageInput[];
  continue?: boolean; // Continue the most recent conversation
  resume?: boolean; // Resume a session (requires sessionId to be set)
}

/**
 * MCP server configuration
 */
export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Claude CLI detection result
 */
export interface CLIDetectionResult {
  found: boolean;
  path?: string;
  version?: string;
}
