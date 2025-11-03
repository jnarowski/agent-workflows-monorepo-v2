import { useState } from 'react';
import type { WorkflowExecutionStep, WorkflowEvent } from '../types';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { WorkflowTimelineCommentItem } from './WorkflowTimelineCommentItem';
import { formatStepName, formatRelativeTime } from '../utils/workflowFormatting';
import { Badge } from '@/client/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Clock,
} from 'lucide-react';

export interface WorkflowTimelineStepItemProps {
  step: WorkflowExecutionStep;
  stepEvents: WorkflowEvent[]; // Comments for this step
}

/**
 * Timeline item for workflow execution steps
 *
 * Collapsed view shows: step name, status badge, phase badge, timestamp
 * Expanded view shows: duration, completed_at, logs, session link, error, step comments
 */
export function WorkflowTimelineStepItem({
  step,
  stepEvents,
}: WorkflowTimelineStepItemProps) {
  // Default to collapsed (expand only if running or failed)
  const [isExpanded, setIsExpanded] = useState(
    step.status === 'running' || step.status === 'failed'
  );

  const hasLogs = step.logs && step.logs.trim().length > 0;
  const hasError = step.error_message && step.error_message.trim().length > 0;
  const hasArtifacts = step.artifacts && step.artifacts.length > 0;
  const hasComments = stepEvents.length > 0;

  const getDuration = () => {
    if (step.completed_at && step.started_at) {
      const duration =
        new Date(step.completed_at).getTime() -
        new Date(step.started_at).getTime();
      const seconds = Math.floor(duration / 1000);
      return `${seconds}s`;
    }
    return null;
  };

  const getTimeDisplay = () => {
    if (step.started_at) {
      return formatRelativeTime(step.started_at);
    }
    return 'Not started';
  };

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className="absolute left-[7px] top-4 h-[14px] w-[14px] rounded-full border-4 border-background bg-primary" />

      {/* Card */}
      <div className="rounded-lg border bg-card shadow-sm">
        {/* Header (clickable to expand/collapse) */}
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

          {/* Phase badge */}
          <Badge variant="outline" className="text-xs">
            {step.phase_name}
          </Badge>

          {/* Status badge */}
          <WorkflowStatusBadge status={step.status} size="sm" />

          {/* Timestamp */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {getTimeDisplay()}
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t px-4 pb-4">
            {/* Duration and completed_at */}
            {step.completed_at && (
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Duration</p>
                  <p className="font-medium">{getDuration() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Completed</p>
                  <p className="font-medium">{formatRelativeTime(step.completed_at)}</p>
                </div>
              </div>
            )}

            {/* Agent session link */}
            {step.agent_session_id && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`/sessions/${step.agent_session_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View agent session
                </a>
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

            {/* Step comments */}
            {hasComments && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Comments</p>
                <div className="space-y-2">
                  {stepEvents.map((event) => (
                    <WorkflowTimelineCommentItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!hasLogs &&
              !hasError &&
              !hasArtifacts &&
              !hasComments &&
              !step.agent_session_id &&
              !step.completed_at && (
                <div className="mt-3 py-6 text-center text-sm text-muted-foreground">
                  No additional details available
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
