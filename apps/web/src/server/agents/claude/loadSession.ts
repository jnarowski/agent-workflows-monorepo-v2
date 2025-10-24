import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { SessionMessage } from '@/shared/types/message.types';
import { parseFormat } from './parseFormat';

/**
 * Encode project path for filesystem storage
 * Replaces `/` with `-` (including leading slash)
 */
function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

/**
 * Get the Claude projects directory path
 */
function getClaudeProjectsDir(): string {
  return path.join(os.homedir(), '.claude', 'projects');
}

/**
 * Get the session JSONL file path
 */
function getSessionFilePath(projectPath: string, sessionId: string): string {
  const encodedPath = encodeProjectPath(projectPath);
  return path.join(getClaudeProjectsDir(), encodedPath, `${sessionId}.jsonl`);
}

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
      .filter((msg): msg is SessionMessage => msg !== null);

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
