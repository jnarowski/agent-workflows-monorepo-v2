import type { AgentExecuteResult } from "../types";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { SessionEventTypes } from "@/shared/types/websocket.types";
import { Channels } from "@/shared/websocket";
import { updateSessionState } from "./updateSessionState";

/**
 * Handle agent execution failure
 *
 * Updates session state to error, broadcasts error events.
 * Used when agent execution fails with non-zero exit code or exception.
 */
export async function handleExecutionFailure(
  sessionId: string,
  result: AgentExecuteResult,
  shouldBroadcast: boolean = true
): Promise<void> {
  const errorMessage = result.error || "Command failed with non-zero exit code";

  // Set session state to error
  await updateSessionState({
    id: sessionId,
    data: { state: "error", errorMessage },
    shouldBroadcast
  });

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
