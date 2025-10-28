/**
 * @repo/agent-cli-sdk-two
 *
 * TypeScript SDK for orchestrating AI-powered CLI tools
 */

import type { UnifiedMessage } from './types/unified';
import { loadClaudeMessages } from './claude/loader';

export const version = '1.0.0';

export interface LoadMessagesOptions {
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  sessionId: string;
  sessionDir?: string;
}

export async function loadMessages(
  options: LoadMessagesOptions
): Promise<UnifiedMessage[]> {
  switch (options.tool) {
    case 'claude':
      return await loadClaudeMessages(options);
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

export async function execute(_options: unknown): Promise<unknown> {
  throw new Error('execute() not yet implemented - coming in Phase 2');
}

export * from './types/unified';
export * from './claude/types';
export { extractTextContent } from './types/unified';
