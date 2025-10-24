import fs from 'fs/promises';
import type { SessionMessage } from '@/shared/types/message.types';
import { parseFormat } from './parseFormat';
import { getSessionFilePath } from '@/server/utils/path';

/**
 * Load a Claude session from JSONL file
 * @param sessionId - Session UUID
 * @param projectPath - Project path
 * @returns Array of typed SessionMessage objects
 */
export async function loadSession(
  sessionId: string,
  projectPath: string
): Promise<SessionMessage[]> {
  const filePath = getSessionFilePath(projectPath, sessionId);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    const messages = lines
      .map((line) => parseFormat(line))
      .filter((msg): msg is SessionMessage => msg !== null)
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp, oldest first

    return messages;
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'ENOENT') {
      // Return empty array for new sessions without messages yet
      return [];
    }
    throw error;
  }
}
