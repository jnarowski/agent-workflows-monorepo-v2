import type { FastifyInstance } from 'fastify';
import { prisma } from '@/shared/prisma';
import type { ActiveSessionData } from '@/server/websocket.types';
import fs from 'fs/promises';

/**
 * Setup graceful shutdown handlers for SIGINT and SIGTERM signals.
 * Ensures clean shutdown of WebSocket connections, server, and database.
 *
 * @param fastify - Fastify server instance
 * @param activeSessions - Map of active WebSocket sessions
 *
 * @example
 * ```ts
 * import { setupGracefulShutdown } from '@/server/utils/shutdown';
 * import { activeSessions } from '@/server/websocket';
 *
 * await server.listen({ port: 3456 });
 * setupGracefulShutdown(server, activeSessions);
 * ```
 */
export async function setupGracefulShutdown(
  fastify: FastifyInstance,
  activeSessions: Map<string, ActiveSessionData>
): Promise<void> {
  const shutdown = async (signal: string) => {
    fastify.log.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

    try {
      // 1. Close Fastify server (stops accepting new connections)
      fastify.log.info('Closing Fastify server...');
      await fastify.close();
      fastify.log.info('Fastify server closed');

      // 2. Cleanup WebSocket sessions and temp image directories
      if (activeSessions.size > 0) {
        fastify.log.info({ count: activeSessions.size }, 'Cleaning up active sessions...');

        for (const [sessionId, sessionData] of activeSessions.entries()) {
          try {
            // Close WebSocket connection
            if (sessionData.socket && sessionData.socket.readyState === 1) { // OPEN state
              sessionData.socket.close(1001, 'Server shutting down');
            }

            // Cleanup temp image directory if it exists
            if (sessionData.tempImageDir) {
              try {
                await fs.rm(sessionData.tempImageDir, { recursive: true, force: true });
                fastify.log.debug({ sessionId, tempImageDir: sessionData.tempImageDir }, 'Cleaned up temp image directory');
              } catch (err) {
                fastify.log.warn({ sessionId, tempImageDir: sessionData.tempImageDir, err }, 'Failed to cleanup temp image directory');
              }
            }
          } catch (err) {
            fastify.log.warn({ sessionId, err }, 'Error cleaning up session');
          }
        }

        activeSessions.clear();
        fastify.log.info('All sessions cleaned up');
      }

      // 3. Disconnect Prisma
      fastify.log.info('Disconnecting Prisma...');
      await prisma.$disconnect();
      fastify.log.info('Prisma disconnected');

      fastify.log.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      fastify.log.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
