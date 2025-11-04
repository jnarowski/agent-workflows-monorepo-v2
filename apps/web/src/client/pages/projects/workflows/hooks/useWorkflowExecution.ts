import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api-client';
import type { WorkflowExecution } from '../types';

interface WorkflowExecutionResponse {
  data: WorkflowExecution;
}

async function fetchWorkflowExecution(
  executionId: string
): Promise<WorkflowExecution> {
  const response = await api.get<WorkflowExecutionResponse>(
    `/api/workflow-executions/${executionId}`
  );
  return response.data;
}

export function useWorkflowExecution(executionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-execution', executionId],
    queryFn: () => fetchWorkflowExecution(executionId!),
    refetchInterval: 5000, // 5 seconds - more frequent for detail view
    enabled: !!executionId,
  });
}
