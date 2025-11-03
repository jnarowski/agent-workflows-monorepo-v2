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
      {/* Timeline Icon */}
      <div className="absolute left-0 -translate-x-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-8 ring-background">
        <FileText className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="pt-2 sm:pt-1 space-y-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left flex items-stretch gap-3"
        >
          {/* Chevron - centered vertically */}
          <div className="flex items-center self-stretch flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title with Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold truncate">
                {formatStepName(step.step_name)}
              </h3>
              <WorkflowStatusBadge status={step.status} size="sm" />
            </div>

            {/* Step Number and Time */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Step {step.step_number}</span>
              <span>•</span>
              <span>{getTimeDisplay()}</span>
              {getDuration() && (
                <>
                  <span>•</span>
                  <span>{getDuration()}</span>
                </>
              )}
              {step.phase_name && (
                <>
                  <span>•</span>
                  <span>{step.phase_name}</span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="pt-2 space-y-3">
            {/* Agent session link */}
            {step.agent_session_id && (
              <div className="flex items-center gap-2 text-sm">
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
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive mb-1">Error</p>
                <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">
                  {step.error_message}
                </pre>
              </div>
            )}

            {/* Logs */}
            {hasLogs && (
              <div>
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
              <div>
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
              <div>
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
              !step.agent_session_id && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No additional details available
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
