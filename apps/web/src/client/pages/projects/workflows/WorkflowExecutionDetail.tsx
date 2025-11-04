import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { WorkflowExecutionHeader } from './components/WorkflowExecutionHeader';
import { WorkflowTimeline } from './components/WorkflowTimeline';
import { buildTimelineModel } from './lib/timelineModel';
import { useWorkflowExecution } from './hooks/useWorkflowExecution';
import { useWorkflowDefinition } from './hooks/useWorkflowDefinition';
import { useWorkflowWebSocket } from './hooks/useWorkflowWebSocket';
import {
  usePauseWorkflow,
  useResumeWorkflow,
  useCancelWorkflow,
} from './hooks/useWorkflowMutations';

export function WorkflowExecutionDetail() {
  const { projectId, definitionId, executionId } = useParams<{
    projectId: string;
    definitionId: string;
    executionId: string;
  }>();
  const navigate = useNavigate();

  // Fetch data
  const { data: execution, isLoading: executionLoading, isError: executionError } = useWorkflowExecution(executionId);
  const { data: definition, isLoading: definitionLoading, isError: definitionError } = useWorkflowDefinition(definitionId);

  // Redirect if execution or definition not found
  useEffect(() => {
    // If execution not found, go back to workflow definition view
    if (executionError || (!executionLoading && !execution)) {
      navigate(`/projects/${projectId}/workflows/${definitionId}`, { replace: true });
      return;
    }

    // If definition not found, go back to workflows list
    if (definitionError || (!definitionLoading && !definition)) {
      navigate(`/projects/${projectId}/workflows`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionError, executionLoading, execution, definitionError, definitionLoading, definition, projectId, definitionId]);

  // Subscribe to WebSocket updates
  useWorkflowWebSocket(projectId!);

  // Mutations
  const pauseWorkflow = usePauseWorkflow();
  const resumeWorkflow = useResumeWorkflow();
  const cancelWorkflow = useCancelWorkflow();

  const isLoading = executionLoading || definitionLoading;

  // Build timeline model from execution data
  const timelineModel = useMemo(() => {
    if (!execution) return null;
    return buildTimelineModel(
      execution,
      execution.steps || [],
      execution.events || [],
      execution.artifacts || []
    );
  }, [execution]);

  if (isLoading || !execution || !definition) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handlePause = async () => {
    await pauseWorkflow.mutateAsync(executionId!);
  };

  const handleResume = async () => {
    await resumeWorkflow.mutateAsync(executionId!);
  };

  const handleCancel = async () => {
    await cancelWorkflow.mutateAsync(executionId!);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb navigation */}
      <div className="border-b bg-background px-6 py-3">
        <button
          onClick={() => navigate(`/projects/${projectId}/workflows/${definitionId}`)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {definition?.name || 'Workflow'}
        </button>
      </div>

      {/* Header */}
      <WorkflowExecutionHeader
        execution={execution}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {/* Timeline section */}
          <section>
            <h2 className="text-xl font-bold mb-4">Execution Timeline</h2>
            {timelineModel && (
              <WorkflowTimeline
                model={timelineModel}
                projectId={projectId!}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
