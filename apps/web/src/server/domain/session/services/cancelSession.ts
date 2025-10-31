import type { FastifyBaseLogger } from "fastify";
import { prisma } from "@/shared/prisma";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { SessionEventTypes, Channels } from "@/shared/websocket";
import { killProcess } from "@repo/agent-cli-sdk";
import { updateSessionState } from "./updateSessionState";

/**
 * Cancel a running agent session
 *
 * Kills the running agent process and returns the session to idle state.
 * Handles validation, process cleanup, and broadcasting.
 *
 * @param sessionId - The ID of the session to cancel
 * @param userId - The ID of the user requesting cancellation (for ownership validation)
 * @param shouldBroadcast - Whether to broadcast the cancellation (default: true)
 * @param logger - Optional logger instance
 * @returns Success/error result
 */
export async function cancelSession(
  sessionId: string,
  userId: string,
  shouldBroadcast: boolean = true,
  logger?: FastifyBaseLogger
): Promise<{ success: boolean; error?: string }> {
  logger?.info({ sessionId, userId }, "Cancelling session");

  // Validate session ownership
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    const errorMsg = "Session not found";
    logger?.warn({ sessionId }, errorMsg);

    if (shouldBroadcast) {
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: errorMsg,
          sessionId,
          code: "SESSION_NOT_FOUND",
        },
      });
    }

    return { success: false, error: errorMsg };
  }

  if (session.userId !== userId) {
    const errorMsg = "Unauthorized: session does not belong to user";
    logger?.warn({ sessionId, userId, ownerId: session.userId }, errorMsg);

    if (shouldBroadcast) {
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: errorMsg,
          sessionId,
          code: "UNAUTHORIZED",
        },
      });
    }

    return { success: false, error: errorMsg };
  }

  // Check if session is in 'working' state
  if (session.state !== "working") {
    const errorMsg = `Cannot cancel session in '${session.state}' state`;
    logger?.warn({ sessionId, state: session.state }, errorMsg);

    if (shouldBroadcast) {
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: errorMsg,
          sessionId,
          code: "INVALID_STATE",
        },
      });
    }

    return { success: false, error: errorMsg };
  }

  // Retrieve process from active sessions
  const process = activeSessions.getProcess(sessionId);

  if (!process) {
    logger?.warn(
      { sessionId },
      "No process found for session (may have already completed)"
    );

    // Update state to idle anyway (race condition handling)
    await updateSessionState(sessionId, "idle", null, shouldBroadcast);

    return { success: true };
  }

  // Mark session as cancelled before killing
  activeSessions.update(sessionId, { cancelled: true });

  // Kill the process with graceful shutdown
  logger?.info({ sessionId, pid: process.pid }, "Killing agent process");

  try {
    const killResult = await killProcess(process, { timeoutMs: 5000 });

    logger?.info(
      {
        sessionId,
        pid: process.pid,
        killed: killResult.killed,
        signal: killResult.signal,
      },
      "Process kill result"
    );
  } catch (killError) {
    // Log but don't fail - process might already be dead
    logger?.warn(
      { err: killError, sessionId, pid: process.pid },
      "Error killing process (may already be dead)"
    );
  }

  // Clear process reference
  activeSessions.clearProcess(sessionId);

  // Update database state to idle
  await updateSessionState(sessionId, "idle", null, shouldBroadcast);

  // Also send message_complete for consistency
  if (shouldBroadcast) {
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.MESSAGE_COMPLETE,
      data: {
        sessionId,
        cancelled: true,
      },
    });
  }

  logger?.info({ sessionId }, "Session cancelled successfully");

  return { success: true };
}
