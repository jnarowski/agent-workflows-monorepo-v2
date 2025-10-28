import fs from 'fs/promises';
import { glob } from 'glob';
import type { UnifiedMessage } from '../types/unified.js';
import { parse } from './parse.js';

// ============================================================================
// Public API
// ============================================================================

/**
 * Options for loading a Codex session.
 */
interface LoadSessionOptions {
  /** Unique identifier for the Codex session (UUID from session_meta) */
  sessionId: string;
  /** Project path (unused by Codex - sessions are globally indexed) */
  projectPath?: string;
}

/**
 * Load and parse messages from a Codex CLI session file.
 *
 * Codex stores sessions in `~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl`.
 * This function searches for the session file by UUID and parses all messages.
 *
 * @param options - Session loading options
 * @returns Promise resolving to an array of parsed messages sorted by timestamp
 *
 * @example
 * ```typescript
 * const messages = await loadSession({
 *   sessionId: '01997e76-d124-7592-9cac-2ec05abbca08'
 * });
 * console.log(`Loaded ${messages.length} messages`);
 * ```
 */
export async function loadSession(
  options: LoadSessionOptions
): Promise<UnifiedMessage[]> {
  const { sessionId } = options;

  // Find the session file
  const sessionPath = await findSessionFile(sessionId);

  if (!sessionPath) {
    // Return empty array if session not found (match Claude behavior)
    return [];
  }

  try {
    const content = await fs.readFile(sessionPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    const messages = lines
      .map(line => parse(line))
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

/**
 * Find a Codex session file by searching for the UUID in the filename.
 *
 * Codex session files are named: rollout-{timestamp}-{uuid}.jsonl
 * They are stored in date-based directories: ~/.codex/sessions/YYYY/MM/DD/
 */
async function findSessionFile(sessionId: string): Promise<string | null> {
  const codexHome = process.env.CODEX_HOME || `${process.env.HOME}/.codex`;
  const sessionsDir = `${codexHome}/sessions`;

  try {
    // Search for file containing the session ID
    // Pattern: sessions/**/*-{sessionId}.jsonl
    const pattern = `${sessionsDir}/**/*-${sessionId}.jsonl`;
    const files = await glob(pattern);

    // Return the first match (should be unique by UUID)
    return files[0] || null;
  } catch {
    return null;
  }
}
