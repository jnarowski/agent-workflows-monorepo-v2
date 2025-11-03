import { Pause, Play, X } from 'lucide-react';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import type { WorkflowExecution } from '../types';

interface WorkflowExecutionHeaderProps {
  execution: WorkflowExecution;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function WorkflowExecutionHeader({
  execution,
  onPause,
  onResume,
  onCancel,
}: WorkflowExecutionHeaderProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const isRunning = execution.status === 'running';
  const isPaused = execution.status === 'paused';
  const isActive = isRunning || isPaused;

  return (
    <div className="border-b bg-background p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{execution.name}</h1>
            <WorkflowStatusBadge status={execution.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Started:</span>
              <span className="ml-2">{formatDate(execution.started_at)}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Completed:</span>
              <span className="ml-2">{formatDate(execution.completed_at)}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Current Phase:</span>
              <span className="ml-2">{execution.current_phase || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Current Step:</span>
              <span className="ml-2">{execution.current_step || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex gap-2">
          {isRunning && (
            <button
              onClick={onPause}
              className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}

          {isPaused && (
            <button
              onClick={onResume}
              className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          )}

          {isActive && (
            <button
              onClick={onCancel}
              className="flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
