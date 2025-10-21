/**
 * Factory functions for creating adapters
 */

import type { ClaudeConfig, CodexConfig } from '../types';
import { ClaudeAdapter } from '../adapters/claude';
import { CodexAdapter } from '../adapters/codex';

/**
 * Create a Claude adapter with sensible defaults
 * @param config Optional configuration
 * @returns Configured ClaudeAdapter instance
 */
export function createClaudeAdapter(config: ClaudeConfig = {}): ClaudeAdapter {
  // Warn about multiple auth methods
  const hasApiKey = !!config.apiKey || !!process.env.ANTHROPIC_API_KEY;
  const hasOAuthToken =
    !!config.oauthToken || !!process.env.CLAUDE_CODE_OAUTH_TOKEN;

  if (hasApiKey && hasOAuthToken) {
    console.warn(
      'Warning: Both API key and OAuth token available. OAuth token will be prioritized.'
    );
  }

  return new ClaudeAdapter(config);
}

/**
 * Create a Codex adapter with sensible defaults
 * @param config Optional configuration
 * @returns Configured CodexAdapter instance
 */
export function createCodexAdapter(config: CodexConfig = {}): CodexAdapter {
  return new CodexAdapter(config);
}
