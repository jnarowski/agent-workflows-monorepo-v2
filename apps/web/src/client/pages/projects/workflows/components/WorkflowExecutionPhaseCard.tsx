import type { WorkflowExecution } from '../types';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { calculateProgress } from '../utils/workflowProgress';
import { formatRelativeTime } from '../utils/workflowFormatting';
import { User } from 'lucide-react';

export interface WorkflowExecutionPhaseCardProps {
  execution: WorkflowExecution;
  onClick: () => void;
}

export function WorkflowExecutionPhaseCard({
  execution,
  onClick,
}: WorkflowExecutionPhaseCardProps) {
  const progress = calculateProgress(execution);
  const timeDisplay = execution.started_at
    ? formatRelativeTime(execution.started_at)
    : formatRelativeTime(execution.created_at);

  // Count steps in current phase
  const currentPhaseSteps = execution.steps?.filter(
    (step) => step.phase_name === execution.current_phase
  ) || [];

  const completedSteps = currentPhaseSteps.filter(
    (step) => step.status === 'completed'
  ).length;

  return (
    <div
      className="group relative cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Workflow execution ${execution.name}, status ${execution.status}, progress ${progress}%`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {execution.name}
          </h3>
          {execution.workflow_definition && (
            <p className="text-xs text-muted-foreground truncate">
              {execution.workflow_definition.name}
            </p>
          )}
        </div>
        <WorkflowStatusBadge status={execution.status} size="sm" />
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Overall Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phase progress */}
      {execution.current_phase && currentPhaseSteps.length > 0 && (
        <div className="mb-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">Phase Progress</span>
            <span>
              {completedSteps} / {currentPhaseSteps.length} steps
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${(completedSteps / currentPhaseSteps.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Current step */}
      {execution.current_step && (
        <div className="mb-3 rounded-md bg-muted/50 p-2 text-xs">
          <span className="font-medium text-muted-foreground">Current: </span>
          <span className="text-foreground">{execution.current_step}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span className="truncate max-w-[100px]">{execution.created_by}</span>
        </div>
        <span>{timeDisplay}</span>
      </div>
    </div>
  );
}
