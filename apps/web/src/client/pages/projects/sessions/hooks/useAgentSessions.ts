import { useQuery } from "@tanstack/react-query";
import type { SessionResponse } from "@/shared/types";
import { api } from "@/client/lib/api-client";

interface UseAgentSessionsOptions {
  projectId: string;
  enabled?: boolean;
}

export const sessionKeys = {
  all: ["agentSessions"] as const,
  byProject: (projectId: string) => ["agentSessions", projectId] as const,
};

async function fetchAgentSessions(
  projectId: string
): Promise<SessionResponse[]> {
  const result = await api.get<{ data: SessionResponse[] }>(
    `/api/projects/${projectId}/sessions`
  );
  return result.data || [];
}

export function useAgentSessions({
  projectId,
  enabled = true,
}: UseAgentSessionsOptions) {
  return useQuery({
    queryKey: sessionKeys.byProject(projectId),
    queryFn: () => fetchAgentSessions(projectId),
    enabled: enabled && !!projectId,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });
}
