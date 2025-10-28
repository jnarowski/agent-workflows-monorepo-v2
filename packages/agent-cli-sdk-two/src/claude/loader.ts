import fs from 'fs/promises';
import type { UnifiedMessage } from '../types/unified';
import { parseClaudeEvent } from './parser';

export interface LoadClaudeMessagesOptions {
  sessionId: string;
  sessionDir?: string;
}

export async function loadClaudeMessages(
  options: LoadClaudeMessagesOptions
): Promise<UnifiedMessage[]> {
  const { sessionId, sessionDir } = options;

  const filePath = sessionId.includes('/') || sessionId.endsWith('.jsonl')
    ? sessionId
    : `${sessionDir || getDefaultSessionDir()}/${sessionId}.jsonl`;

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    const messages = lines
      .map(line => parseClaudeEvent(line))
      .filter((msg): msg is UnifiedMessage => msg !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    return messages;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function getDefaultSessionDir(): string {
  // Try common Claude session directories
  // 1. Official Claude Code sessions directory
  // 2. Claude projects directory (used in some Claude versions)
  return process.env.CLAUDE_SESSION_DIR ||
         `${process.env.HOME}/.claude/projects` ||
         `${process.env.HOME}/.claude-code/sessions`;
}
