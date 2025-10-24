/**
 * API client functions for making authenticated requests to the backend
 */

import type { SessionMessage } from "@/shared/types/chat";
import { fetchWithAuth } from "@/client/lib/auth";

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
    const response = await fetchWithAuth<{ data: SessionMessage[] }>(
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
