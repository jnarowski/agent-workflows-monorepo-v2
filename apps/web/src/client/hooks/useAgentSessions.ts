import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/client/contexts/AuthContext";
import type { SessionResponse } from "@/shared/types";

interface UseAgentSessionsOptions {
  projectId: string;
  enabled?: boolean;
}

async function fetchAgentSessions(
  projectId: string,
  onUnauthorized?: () => void
): Promise<SessionResponse[]> {
  const response = await fetch(`/api/projects/${projectId}/sessions`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - invalid or missing token
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
      throw new Error("Session expired");
    }
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || [];
}

export function useAgentSessions({
  projectId,
  enabled = true,
}: UseAgentSessionsOptions) {
  const { handleInvalidToken } = useAuth();

  return useQuery({
    queryKey: ["agentSessions", projectId],
    queryFn: () => fetchAgentSessions(projectId, handleInvalidToken),
    enabled: enabled && !!projectId,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });
}
