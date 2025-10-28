import fs from 'fs/promises';
import type { UnifiedMessage } from '../types/unified';
import { parser } from './parse';

// ============================================================================
// Public API
// ============================================================================

interface LoaderOptions {
  sessionId: string;
  projectPath: string;
}

export async function loader(options: LoaderOptions): Promise<UnifiedMessage[]> {
  const { sessionId, projectPath } = options;
  const filePath = `${getClaudeProjectDir(projectPath)}/${sessionId}.jsonl`;

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    const messages = lines
      .map((line) => parser(line))
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

// ============================================================================
// Private Helpers
// ============================================================================

function getClaudeProjectDir(projectPath: string): string {
  // Claude encodes project paths by replacing slashes with dashes
  // e.g., /Users/jnarowski/Dev/playground -> -Users-jnarowski-Dev-playground
  const encodedPath = projectPath.replace(/\//g, '-');
  return `${process.env.HOME}/.claude/projects/${encodedPath}`;
}
