/**
 * API client functions for making authenticated requests to the backend
 */

import type { SessionMessage } from "@/shared/types/chat";
import { api } from "@/client/lib/api-client";

/**
 * Re-export API client for convenience
 */
export { api } from "@/client/lib/api-client";

/**
 * Fetch historical messages for a session from JSONL file
 * @param projectId - The project ID
 * @param sessionId - The session ID
 * @returns Array of chat messages
 */
export async function getSessionMessages(
  projectId: string,
  sessionId: string
): Promise<SessionMessage[]> {
  try {
    const response = await api.get<{ data: SessionMessage[] }>(
      `/api/projects/${projectId}/sessions/${sessionId}/messages`
    );
    return response.data || [];
  } catch (error) {
    // If 404, return empty array (no JSONL file exists yet)
    if (error instanceof Error && error.message.includes('404')) {
      return [];
    }
    throw error;
  }
}
