/**
 * Claude-specific types
 */

import type { ExecutionOptions } from '../shared/types';

/**
 * Image input for Claude
 */
export interface ImageInput {
  path: string;
  mimeType?: string;
}

/**
 * Claude-specific execution options
 */
export interface ClaudeOptions extends ExecutionOptions {
  model?: 'opus' | 'sonnet' | 'haiku';
  apiKey?: string;
  oauthToken?: string;
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
 * Claude adapter configuration
 */
export interface ClaudeConfig extends Partial<ClaudeOptions> {
  cliPath?: string;
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
