import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { WorkflowStatus } from '../types';
import type { WorkflowExecution } from '../types';
import { WorkflowExecutionCard } from './WorkflowExecutionCard';
import { getWorkflowStatusConfig } from '../utils/workflowStatus';

export interface WorkflowKanbanColumnProps {
  status: WorkflowStatus;
  executions: WorkflowExecution[];
  onExecutionClick: (execution: WorkflowExecution) => void;
  onPause?: (executionId: string) => void;
  onResume?: (executionId: string) => void;
  onCancel?: (executionId: string) => void;
}

export function WorkflowKanbanColumn({
  status,
  executions,
  onExecutionClick,
  onPause,
  onResume,
  onCancel,
}: WorkflowKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const config = getWorkflowStatusConfig(status);
  const Icon = config.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[600px] flex-col rounded-lg border bg-muted/50 p-4 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : ''
      }`}
    >
      {/* Column header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.textColor}`} />
          <h2 className="font-semibold text-base">{config.label}</h2>
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
            {executions.length}
          </span>
        </div>
      </div>

      {/* Execution cards */}
      <SortableContext
        items={executions.map((e) => e.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-3 overflow-y-auto">
          {executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No {config.label.toLowerCase()} workflows
              </p>
            </div>
          ) : (
            executions.map((execution) => (
              <WorkflowExecutionCard
                key={execution.id}
                execution={execution}
                onClick={() => onExecutionClick(execution)}
                onPause={
                  onPause ? () => onPause(execution.id) : undefined
                }
                onResume={
                  onResume ? () => onResume(execution.id) : undefined
                }
                onCancel={
                  onCancel ? () => onCancel(execution.id) : undefined
                }
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
