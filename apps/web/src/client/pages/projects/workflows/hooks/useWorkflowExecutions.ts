import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api-client';
import type { WorkflowExecutionListItem, WorkflowFilter } from '../types';

interface WorkflowExecutionsResponse {
  data: WorkflowExecutionListItem[];
}

async function fetchWorkflowExecutions(
  projectId: string,
  filter?: WorkflowFilter
): Promise<WorkflowExecutionListItem[]> {
  const params = new URLSearchParams();
  params.append('project_id', projectId);

  if (filter?.status) {
    params.append('status', filter.status);
  }
  if (filter?.search) {
    params.append('search', filter.search);
  }
  if (filter?.definitionId) {
    params.append('definition_id', filter.definitionId);
  }

  const response = await api.get<WorkflowExecutionsResponse>(
    `/api/workflow-executions?${params.toString()}`
  );
  return response.data;
}

export function useWorkflowExecutions(
  projectId: string,
  filter?: WorkflowFilter
) {
  return useQuery({
    queryKey: ['workflow-executions', projectId, filter],
    queryFn: () => fetchWorkflowExecutions(projectId, filter),
    refetchInterval: 10000, // 10 seconds as fallback if WebSocket disconnects
    enabled: !!projectId,
  });
}
