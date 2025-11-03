import type { WorkflowEvent, CommentType } from '../types';
import { formatRelativeTime } from '../utils/workflowFormatting';
import { Badge } from '@/client/components/ui/badge';
import { User, Bot, Settings, FileText } from 'lucide-react';

export interface WorkflowTimelineCommentItemProps {
  event: WorkflowEvent; // event_type='comment_added'
}

/**
 * Timeline item for comment events
 *
 * Extracts comment data from event_data and renders:
 * - User badge (from created_by_user relation)
 * - Comment text (from event_data.text)
 * - Comment type indicator (from event_data.comment_type)
 * - Timestamp (created_at)
 * - Artifacts (if attached)
 */
export function WorkflowTimelineCommentItem({ event }: WorkflowTimelineCommentItemProps) {
  // Extract comment data from event_data
  const commentData = event.event_data as {
    text: string;
    comment_type: CommentType;
  };

  const commentType = commentData.comment_type;
  const commentText = commentData.text;

  // Get icon based on comment type
  const Icon = getCommentIcon(commentType);

  // Get style based on comment type
  const styleClass = getCommentStyle(commentType);

  // Get user display name
  const userName = event.created_by_user?.username || 'Unknown User';

  return (
    <div className={`rounded-lg border p-4 ${styleClass}`}>
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <Badge variant="outline" className="text-xs">
          {commentType === 'system'
            ? 'System'
            : commentType === 'agent'
              ? 'Agent'
              : userName}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(event.created_at)}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm whitespace-pre-wrap">{commentText}</p>

      {/* Artifacts */}
      {event.artifacts && event.artifacts.length > 0 && (
        <div className="mt-3 space-y-2">
          {event.artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-xs"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{artifact.file_name}</span>
              <button
                onClick={() => {
                  window.open(`/api/artifacts/${artifact.id}/download`, '_blank');
                }}
                className="text-primary hover:underline"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Get icon component based on comment type
 */
function getCommentIcon(type: CommentType): typeof User {
  switch (type) {
    case 'user':
      return User;
    case 'agent':
      return Bot;
    case 'system':
      return Settings;
    default:
      return User;
  }
}

/**
 * Get style class based on comment type
 */
function getCommentStyle(type: CommentType): string {
  switch (type) {
    case 'user':
      return 'bg-card border-border';
    case 'agent':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
    case 'system':
      return 'bg-muted border-muted-foreground/20';
    default:
      return 'bg-card border-border';
  }
}
