import { Package } from 'lucide-react';
import type { WorkflowExecution } from '../types';
import { WorkflowExecutionCard } from './WorkflowExecutionCard';

export interface WorkflowPhaseKanbanColumnProps {
  phaseId: string;
  phaseLabel: string;
  executions: WorkflowExecution[];
  onExecutionClick: (execution: WorkflowExecution) => void;
}

export function WorkflowPhaseKanbanColumn({
  phaseLabel,
  executions,
  onExecutionClick,
}: WorkflowPhaseKanbanColumnProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border bg-muted/50 p-4">
      {/* Column header */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">{phaseLabel}</h2>
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
            {executions.length}
          </span>
        </div>
      </div>

      {/* Execution cards */}
      <div className="flex-1 space-y-3 overflow-y-auto min-h-0">
        {executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No executions in {phaseLabel}
            </p>
          </div>
        ) : (
          executions.map((execution) => (
            <WorkflowExecutionCard
              key={execution.id}
              execution={execution}
              onClick={() => onExecutionClick(execution)}
            />
          ))
        )}
      </div>
    </div>
  );
}
