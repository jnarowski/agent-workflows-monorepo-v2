import { useQuery } from '@tanstack/react-query';
import type { SessionResponse } from '../../shared/types';

interface UseAgentSessionsOptions {
  projectId: string;
  enabled?: boolean;
}

async function fetchAgentSessions(projectId: string): Promise<SessionResponse[]> {
  const response = await fetch(`/api/projects/${projectId}/sessions`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || [];
}

export function useAgentSessions({ projectId, enabled = true }: UseAgentSessionsOptions) {
  return useQuery({
    queryKey: ['agentSessions', projectId],
    queryFn: () => fetchAgentSessions(projectId),
    enabled: enabled && !!projectId,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });
}
