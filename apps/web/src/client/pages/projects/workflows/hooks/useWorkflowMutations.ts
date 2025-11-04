import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/client/lib/api-client';
import { toast } from 'sonner';
import type { WorkflowExecution, WorkflowComment, WorkflowArtifact } from '../types';

// Create workflow
interface CreateWorkflowInput {
  projectId: string;
  definitionId: string;
  name: string;
  args: Record<string, unknown>;
}

interface CreateWorkflowResponse {
  data: WorkflowExecution;
}

async function createWorkflow(input: CreateWorkflowInput): Promise<WorkflowExecution> {
  const response = await api.post<CreateWorkflowResponse>(
    '/api/workflow-executions',
    {
      project_id: input.projectId,
      workflow_definition_id: input.definitionId,
      name: input.name,
      args: input.args,
    }
  );
  return response.data;
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-executions', data.project_id],
      });
      toast.success('Workflow created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create workflow');
    },
  });
}

// Pause workflow
async function pauseWorkflow(executionId: string): Promise<void> {
  await api.post(`/api/workflow-executions/${executionId}/pause`);
}

export function usePauseWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pauseWorkflow,
    onSuccess: (_data, executionId) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', executionId],
      });
      toast.success('Workflow paused');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to pause workflow');
    },
  });
}

// Resume workflow
async function resumeWorkflow(executionId: string): Promise<void> {
  await api.post(`/api/workflow-executions/${executionId}/resume`);
}

export function useResumeWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeWorkflow,
    onSuccess: (_data, executionId) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', executionId],
      });
      toast.success('Workflow resumed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resume workflow');
    },
  });
}

// Cancel workflow
async function cancelWorkflow(executionId: string): Promise<void> {
  await api.post(`/api/workflow-executions/${executionId}/cancel`);
}

export function useCancelWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelWorkflow,
    onSuccess: (_data, executionId) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', executionId],
      });
      toast.success('Workflow cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel workflow');
    },
  });
}

// Create annotation
interface CreateAnnotationInput {
  executionId: string;
  content: string;
  stepId?: string;
}

interface CreateAnnotationResponse {
  data: WorkflowComment;
}

async function createAnnotation(input: CreateAnnotationInput): Promise<WorkflowComment> {
  const response = await api.post<CreateAnnotationResponse>(
    `/api/workflow-executions/${input.executionId}/comments`,
    {
      content: input.content,
      step_id: input.stepId,
    }
  );
  return response.data;
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnotation,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', variables.executionId],
      });
      toast.success('Annotation added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add annotation');
    },
  });
}

// Upload artifact
interface UploadArtifactInput {
  executionId: string;
  stepId?: string;
  file: File;
}

interface UploadArtifactResponse {
  data: WorkflowArtifact;
}

async function uploadArtifact(input: UploadArtifactInput): Promise<WorkflowArtifact> {
  const formData = new FormData();
  formData.append('file', input.file);
  if (input.stepId) {
    formData.append('step_id', input.stepId);
  }

  const response = await api.post<UploadArtifactResponse>(
    `/api/workflow-executions/${input.executionId}/artifacts`,
    formData
  );
  return response.data;
}

export function useUploadArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadArtifact,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', variables.executionId],
      });
      toast.success('Artifact uploaded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload artifact');
    },
  });
}
