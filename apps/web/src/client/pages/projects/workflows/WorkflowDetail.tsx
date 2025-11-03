/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pause, Play, X } from 'lucide-react';
import { WorkflowStatusBadge } from './components/WorkflowStatusBadge';
import { WorkflowPhaseTimeline } from './components/WorkflowPhaseTimeline';
import { WorkflowPhaseKanbanColumn } from './components/WorkflowPhaseKanbanColumn';
import { useWorkflowExecution } from './hooks/useWorkflowExecution';
import { useWorkflowExecutions } from './hooks/useWorkflowExecutions';
import { useWorkflowWebSocket } from './hooks/useWorkflowWebSocket';
import {
  usePauseWorkflow,
  useResumeWorkflow,
  useCancelWorkflow,
} from './hooks/useWorkflowMutations';
import { calculateProgress, calculateDuration } from './utils/workflowProgress';

export function WorkflowDetail() {
  const { projectId, executionId } = useParams<{
    projectId: string;
    executionId: string;
  }>();
  const navigate = useNavigate();

  const { data: execution, isLoading: executionLoading } = useWorkflowExecution(executionId);

  // Get the workflow definition to access phases
  const workflowDefinitionId = execution?.workflow_definition_id;

  // Fetch all executions for this workflow definition
  const { data: allExecutions, isLoading: executionsLoading } = useWorkflowExecutions(
    projectId!,
    { definitionId: workflowDefinitionId }
  );

  useWorkflowWebSocket(projectId!);

  const pauseWorkflow = usePauseWorkflow();
  const resumeWorkflow = useResumeWorkflow();
  const cancelWorkflow = useCancelWorkflow();

  if (executionLoading || !execution) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const progress = calculateProgress(execution);
  const duration = calculateDuration(execution);

  // Get phases from workflow definition
  const phases = execution.workflow_definition?.phases || [];

  // Group executions by current phase
  const executionsByPhase = (allExecutions || []).reduce(
    (acc, exec) => {
      const phase = exec.current_phase || 'Not Started';
      if (!acc[phase]) {
        acc[phase] = [];
      }
      acc[phase].push(exec);
      return acc;
    },
    {} as Record<string, any[]>
  );

  const handleExecutionClick = (clickedExecution: any) => {
    // Navigate to the clicked execution
    navigate(`/projects/${projectId}/workflows/${clickedExecution.id}`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/projects/${projectId}/workflows`)}
            className="rounded-md p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {execution.workflow_definition?.name || execution.name}
              </h1>
              <span className="text-sm text-muted-foreground">
                {(allExecutions || []).length} execution{(allExecutions || []).length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Workflow Definition • {phases.length} phase{phases.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Kanban Board - Full Screen */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {executionsLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="flex gap-4 h-full min-w-full">
            {/* Add "Not Started" column first */}
            {executionsByPhase['Not Started'] && (
              <div className="flex-1 min-w-80 h-full">
                <WorkflowPhaseKanbanColumn
                  phase="Not Started"
                  executions={executionsByPhase['Not Started']}
                  onExecutionClick={handleExecutionClick}
                />
              </div>
            )}

            {/* Then add columns for each phase from the definition */}
            {phases.map((phase: any) => {
              const phaseName = typeof phase === 'string' ? phase : phase.name;
              return (
                <div key={phaseName} className="flex-1 min-w-80 h-full">
                  <WorkflowPhaseKanbanColumn
                    phase={phaseName}
                    executions={executionsByPhase[phaseName] || []}
                    onExecutionClick={handleExecutionClick}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
