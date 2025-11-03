import { Link } from 'react-router-dom';
import { ExternalLink, Copy, MessageSquare } from 'lucide-react';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import type { WorkflowExecutionStep, WorkflowComment } from '../types';

interface WorkflowExecutionStepsListProps {
  steps: WorkflowExecutionStep[];
  comments: WorkflowComment[];
  projectId: string;
}

export function WorkflowExecutionStepsList({
  steps,
  comments,
  projectId,
}: WorkflowExecutionStepsListProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getCommentTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'system':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      case 'agent':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const calculateDuration = (startedAt: Date | null, completedAt: Date | null) => {
    if (!startedAt || !completedAt) return null;
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No steps have been executed yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {steps.map((step) => {
        const duration = calculateDuration(step.started_at, step.completed_at);
        const stepComments = comments.filter(
          (comment) => comment.workflow_execution_step_id === step.id
        );

        return (
          <div
            key={step.id}
            className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{step.step_name}</h3>
                  <WorkflowStatusBadge status={step.status} />
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {step.phase_name}
                  </span>
                  {stepComments.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      <MessageSquare className="h-3 w-3" />
                      {stepComments.length}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Started:</span>
                    <span className="ml-2">{formatDate(step.started_at)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Completed:</span>
                    <span className="ml-2">{formatDate(step.completed_at)}</span>
                  </div>
                  {duration && (
                    <div>
                      <span className="font-medium text-muted-foreground">Duration:</span>
                      <span className="ml-2">{duration}</span>
                    </div>
                  )}
                </div>

                {/* Agent session link */}
                {step.agent_session_id && (
                  <div className="mt-3">
                    <Link
                      to={`/projects/${projectId}/session/${step.agent_session_id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Agent Session
                    </Link>
                  </div>
                )}

                {/* Log directory path */}
                {step.logs && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Logs:</span>
                      <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono">
                        {step.logs}
                      </code>
                      <button
                        onClick={() => copyToClipboard(step.logs || '')}
                        className="p-1 hover:bg-muted rounded"
                        title="Copy log path"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {step.status === 'failed' && step.error_message && (
                  <div className="mt-3 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Error:</p>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">{step.error_message}</p>
                  </div>
                )}

                {/* Step-specific comments */}
                {stepComments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      <span>Comments</span>
                    </div>
                    <div className="space-y-2 pl-1">
                      {stepComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-md bg-muted/30 p-3 border border-muted"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${getCommentTypeBadgeClass(comment.comment_type)}`}>
                              {comment.comment_type.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
