import type { AgentSession } from "@prisma/client";
import { prisma } from "@/shared/prisma";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { SessionEventTypes, Channels } from "@/shared/websocket";

/**
 * Generic session update service
 *
 * Updates a session in the database and optionally broadcasts the update via WebSocket.
 * This service consolidates the repetitive "update database + broadcast" pattern
 * used throughout the session handler.
 *
 * @param sessionId - The ID of the session to update
 * @param data - Partial session data to update
 * @param shouldBroadcast - Whether to broadcast the update event (default: true)
 * @returns The updated session
 */
export async function updateSession(
  sessionId: string,
  data: Partial<AgentSession>,
  shouldBroadcast: boolean = true
): Promise<AgentSession> {
  // Update database
  const session = await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });

  // Optionally broadcast update event
  if (shouldBroadcast) {
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.SESSION_UPDATED,
      data: {
        sessionId,
        ...data,
        updated_at: session.updated_at.toISOString(),
      },
    });
  }

  return session;
}
