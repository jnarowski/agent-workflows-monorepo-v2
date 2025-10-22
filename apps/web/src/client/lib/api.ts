/**
 * API client functions for making authenticated requests to the backend
 */

import type { ChatMessage } from "../../shared/types/chat";

/**
 * Helper to get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

/**
 * Helper to make authenticated API calls
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  return response;
}

/**
 * Fetch historical messages for a session from JSONL file
 * @param projectId - The project ID
 * @param sessionId - The session ID
 * @returns Array of chat messages
 */
export async function getSessionMessages(
  projectId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const response = await fetchWithAuth(
    `/api/projects/${projectId}/sessions/${sessionId}/messages`
  );

  if (!response.ok) {
    if (response.status === 404) {
      // No JSONL file exists yet - return empty array
      return [];
    }
    throw new Error(`Failed to fetch session messages: ${response.statusText}`);
  }

  const { data } = await response.json();
  return data || [];
}
