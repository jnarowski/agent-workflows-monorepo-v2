import { useState } from 'react';
import type { WorkflowExecutionStep } from '../types';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { formatStepName, formatRelativeTime } from '../utils/workflowFormatting';
import { ChevronDown, ChevronRight, ExternalLink, FileText } from 'lucide-react';

export interface WorkflowStepCardProps {
  step: WorkflowExecutionStep;
  onAgentSessionClick?: () => void;
}

export function WorkflowStepCard({
  step,
  onAgentSessionClick,
}: WorkflowStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    step.status === 'running' || step.status === 'failed'
  );

  const hasLogs = step.logs && step.logs.trim().length > 0;
  const hasError = step.error_message && step.error_message.trim().length > 0;
  const hasArtifacts = step.artifacts && step.artifacts.length > 0;

  const getTimeDisplay = () => {
    if (step.completed_at && step.started_at) {
      const duration =
        new Date(step.completed_at).getTime() -
        new Date(step.started_at).getTime();
      const seconds = Math.floor(duration / 1000);
      return `${seconds}s`;
    }
    if (step.started_at) {
      return formatRelativeTime(step.started_at);
    }
    return 'Not started';
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        {/* Expand icon */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}

        {/* Step name */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">
            {formatStepName(step.step_name)}
          </h3>
        </div>

        {/* Status badge */}
        <WorkflowStatusBadge status={step.status} size="sm" />

        {/* Time */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {getTimeDisplay()}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t px-4 pb-4">
          {/* Agent session link */}
          {step.agent_session_id && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={onAgentSessionClick}
                className="text-primary hover:underline"
              >
                View agent session
              </button>
            </div>
          )}

          {/* Error message */}
          {hasError && (
            <div className="mt-3 rounded-md bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive mb-1">Error</p>
              <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">
                {step.error_message}
              </pre>
            </div>
          )}

          {/* Logs */}
          {hasLogs && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">Logs</p>
              <div className="rounded-md bg-muted p-3 max-h-64 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90">
                  {step.logs}
                </pre>
              </div>
            </div>
          )}

          {/* Artifacts */}
          {hasArtifacts && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">Artifacts</p>
              <div className="space-y-2">
                {step.artifacts?.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{artifact.file_name}</span>
                    <button
                      onClick={() => {
                        // Download artifact
                        window.open(`/api/artifacts/${artifact.id}/download`, '_blank');
                      }}
                      className="text-primary hover:underline text-xs"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasLogs && !hasError && !hasArtifacts && !step.agent_session_id && (
            <div className="mt-3 py-6 text-center text-sm text-muted-foreground">
              No additional details available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
