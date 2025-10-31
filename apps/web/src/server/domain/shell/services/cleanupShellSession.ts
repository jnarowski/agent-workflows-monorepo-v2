import type * as pty from 'node-pty';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Cleanup a shell session by killing the PTY process
 * @param ptyProcess - PTY process to cleanup
 * @param sessionId - Session ID for logging
 * @param logger - Optional Fastify logger
 */
export function cleanupShellSession(
  ptyProcess: pty.IPty,
  sessionId: string,
  logger?: FastifyBaseLogger
): void {
  try {
    ptyProcess.kill();
  } catch (error) {
    logger?.error({ err: error, sessionId }, 'Error killing PTY process');
  }
}
