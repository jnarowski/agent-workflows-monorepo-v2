import type { FastifyBaseLogger } from "fastify";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import { cleanupTempDir } from "@/server/websocket/infrastructure/cleanup";

/**
 * Clean up temporary image files for a session
 *
 * Removes the temporary directory used for uploaded images during session execution.
 * Updates activeSessions to clear the tempImageDir reference.
 * Non-critical operation - doesn't throw on failure.
 *
 * @param sessionId - The ID of the session to clean up
 * @param logger - Optional logger instance
 */
export async function cleanupSessionImages(
  sessionId: string,
  logger?: FastifyBaseLogger
): Promise<void> {
  const sessionData = activeSessions.get(sessionId);
  await cleanupTempDir(sessionData?.tempImageDir, logger);

  if (sessionData) {
    activeSessions.update(sessionId, { tempImageDir: undefined });
  }
}
