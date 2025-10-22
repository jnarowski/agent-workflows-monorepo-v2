/**
 * React Query hook for fetching historical session messages from JSONL files
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getSessionMessages } from "../lib/api";
import type { ChatMessage } from "../../shared/types/chat";

/**
 * Query keys factory for session messages
 */
export const sessionMessageKeys = {
  all: ["sessionMessages"] as const,
  bySession: (projectId: string, sessionId: string) =>
    [...sessionMessageKeys.all, projectId, sessionId] as const,
};

/**
 * Hook to fetch historical messages for a session
 * Messages are loaded from .claude/projects/{encodedPath}/{sessionId}.jsonl files
 *
 * @param projectId - The project ID
 * @param sessionId - The session ID
 * @returns Query result with historical messages
 */
export function useSessionMessages(
  projectId: string,
  sessionId: string
): UseQueryResult<ChatMessage[], Error> {
  return useQuery({
    queryKey: sessionMessageKeys.bySession(projectId, sessionId),
    queryFn: () => getSessionMessages(projectId, sessionId),
    enabled: !!projectId && !!sessionId,
    staleTime: Infinity, // Historical messages don't change
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
