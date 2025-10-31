import type { FastifyBaseLogger } from 'fastify';
import { getUserSessions } from './getShellSession.js';
import { destroyShellSession } from './destroyShellSession.js';

/**
 * Cleanup all sessions for a specific user
 * @param userId - User ID
 * @param logger - Optional Fastify logger
 */
export function cleanupUserSessions(userId: string, logger?: FastifyBaseLogger): void {
  const sessionIds = getUserSessions(userId);
  for (const sessionId of sessionIds) {
    destroyShellSession(sessionId, logger);
  }
}
