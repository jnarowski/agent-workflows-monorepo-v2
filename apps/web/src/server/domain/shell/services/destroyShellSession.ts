import type { FastifyBaseLogger } from 'fastify';
import { getShellSession, removeShellSession } from './getShellSession';
import { cleanupShellSession } from './cleanupShellSession';

/**
 * Destroy a shell session
 * @param sessionId - Session ID
 * @param logger - Optional Fastify logger
 */
export function destroyShellSession(sessionId: string, logger?: FastifyBaseLogger): void {
  const session = getShellSession(sessionId);
  if (session) {
    cleanupShellSession(session.ptyProcess, sessionId, logger);
    removeShellSession(sessionId);
  }
}
