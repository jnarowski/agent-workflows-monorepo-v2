import type { AgentSession } from "@prisma/client";
import { updateSession } from "./updateSession";

/**
 * Update session state with proper validation and error handling
 *
 * Handles state transitions for agent sessions:
 * - idle → working: Message execution started
 * - working → idle: Message completed successfully
 * - working → error: Message failed
 * - * → idle: Cancel/reset
 *
 * @param sessionId - The ID of the session to update
 * @param state - The new state ('working', 'idle', or 'error')
 * @param errorMessage - Error message (required when state is 'error', cleared otherwise)
 * @param shouldBroadcast - Whether to broadcast the state change (default: true)
 * @returns The updated session
 */
export async function updateSessionState(
  sessionId: string,
  state: "working" | "idle" | "error",
  errorMessage?: string | null,
  shouldBroadcast: boolean = true
): Promise<AgentSession> {
  // Build update data based on state
  const updateData: Partial<AgentSession> = {
    state,
  };

  // Clear error_message when transitioning to working/idle
  if (state === "working" || state === "idle") {
    updateData.error_message = null;
  }

  // Set error_message when transitioning to error
  if (state === "error") {
    updateData.error_message = errorMessage || "An unknown error occurred";
  }

  // Use generic updateSession service
  return await updateSession(sessionId, updateData, shouldBroadcast);
}
