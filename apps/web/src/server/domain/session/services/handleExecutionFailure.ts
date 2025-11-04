import type { FastifyBaseLogger } from "fastify";
import type { AgentExecuteResult } from "../types";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { SessionEventTypes } from "@/shared/types/websocket.types";
import { Channels } from "@/shared/websocket";
import { updateSessionState } from "./updateSessionState";

/**
 * Handle agent execution failure
 *
 * Updates session state to error, broadcasts error events, and logs failure details.
 * Used when agent execution fails with non-zero exit code or exception.
 *
 * @param sessionId - The ID of the session that failed
 * @param result - The execution result containing error details
 * @param shouldBroadcast - Whether to broadcast error events (default: true)
 * @param logger - Optional logger instance
 */
export async function handleExecutionFailure(
  sessionId: string,
  result: AgentExecuteResult,
  shouldBroadcast: boolean = true,
  logger?: FastifyBaseLogger
): Promise<void> {
  const errorMessage = result.error || "Command failed with non-zero exit code";

  logger?.error(
    { sessionId, exitCode: result.exitCode, error: errorMessage },
    "Agent CLI SDK command failed"
  );

  // Set session state to error
  await updateSessionState(sessionId, "error", errorMessage, shouldBroadcast);

  // Broadcast additional ERROR event for client notification
  if (shouldBroadcast) {
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.ERROR,
      data: {
        error: errorMessage,
        sessionId,
      },
    });
  }
}
