import type { WorkflowExecution } from '../types';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { calculateProgress } from '../utils/workflowProgress';
import { formatRelativeTime } from '../utils/workflowFormatting';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, MoreVertical, Pause, Play, X } from 'lucide-react';

export interface WorkflowExecutionCardProps {
  execution: WorkflowExecution;
  onClick: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export function WorkflowExecutionCard({
  execution,
  onClick,
  onPause,
  onResume,
  onCancel,
}: WorkflowExecutionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: execution.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const progress = calculateProgress(execution);
  const timeDisplay = execution.started_at
    ? formatRelativeTime(execution.started_at)
    : formatRelativeTime(execution.created_at);

  const handleActionClick = (
    e: React.MouseEvent,
    action: () => void
  ) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md ${
        isDragging ? 'scale-105 rotate-2 opacity-50' : ''
      }`}
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
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current phase/step */}
      {execution.current_phase && (
        <div className="mb-3 text-xs text-muted-foreground">
          <span className="font-medium">Phase:</span> {execution.current_phase}
          {execution.current_step && (
            <>
              {' '}
              <span className="mx-1">•</span>
              <span>{execution.current_step}</span>
            </>
          )}
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

      {/* Quick actions (visible on hover) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 rounded-md bg-background/95 p-1 shadow-md">
          {execution.status === 'running' && onPause && (
            <button
              onClick={(e) => handleActionClick(e, onPause)}
              className="rounded p-1 hover:bg-muted"
              aria-label="Pause workflow"
              title="Pause"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          {execution.status === 'paused' && onResume && (
            <button
              onClick={(e) => handleActionClick(e, onResume)}
              className="rounded p-1 hover:bg-muted"
              aria-label="Resume workflow"
              title="Resume"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {(execution.status === 'running' || execution.status === 'paused') &&
            onCancel && (
              <button
                onClick={(e) => handleActionClick(e, onCancel)}
                className="rounded p-1 hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Cancel workflow"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          <button
            onClick={(e) => e.stopPropagation()}
            className="rounded p-1 hover:bg-muted"
            aria-label="More actions"
            title="More"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
