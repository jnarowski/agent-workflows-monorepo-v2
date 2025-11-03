import { useState, useRef, useEffect } from 'react';
import { CommentType } from '../types';
import type { WorkflowComment } from '../types';
import { formatAbsoluteTime } from '../utils/workflowFormatting';
import { User, Bot, Settings, Send, FileText } from 'lucide-react';

export interface WorkflowCommentThreadProps {
  comments: WorkflowComment[];
  onAddComment: (content: string) => Promise<void>;
  isLoading?: boolean;
}

export function WorkflowCommentThread({
  comments,
  onAddComment,
  isLoading = false,
}: WorkflowCommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const endOfCommentsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest comment
  useEffect(() => {
    endOfCommentsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCommentIcon = (type: CommentType) => {
    switch (type) {
      case CommentType.USER:
        return User;
      case CommentType.AGENT:
        return Bot;
      case CommentType.SYSTEM:
        return Settings;
      default:
        return User;
    }
  };

  const getCommentStyle = (type: CommentType) => {
    switch (type) {
      case CommentType.USER:
        return 'bg-card border-border';
      case CommentType.AGENT:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
      case CommentType.SYSTEM:
        return 'bg-muted border-muted-foreground/20';
      default:
        return 'bg-card border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Comments list */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No comments yet. Be the first to comment!
            </p>
          </div>
        ) : (
          <>
            {comments.map((comment) => {
              const Icon = getCommentIcon(comment.comment_type);
              const styleClass = getCommentStyle(comment.comment_type);

              return (
                <div
                  key={comment.id}
                  className={`rounded-lg border p-4 ${styleClass}`}
                >
                  {/* Header */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">
                      {comment.comment_type === CommentType.SYSTEM
                        ? 'System'
                        : comment.comment_type === CommentType.AGENT
                          ? 'Agent'
                          : comment.created_by}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatAbsoluteTime(comment.created_at)}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

                  {/* Artifacts */}
                  {comment.artifacts && comment.artifacts.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comment.artifacts.map((artifact) => (
                        <div
                          key={artifact.id}
                          className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-xs"
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="flex-1 truncate">{artifact.file_name}</span>
                          <button
                            onClick={() => {
                              window.open(
                                `/api/artifacts/${artifact.id}/download`,
                                '_blank'
                              );
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
            })}
            <div ref={endOfCommentsRef} />
          </>
        )}
      </div>

      {/* New comment form */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            maxLength={1000}
            disabled={isSubmitting}
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="flex h-10 w-10 items-center justify-center self-end rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Send comment"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          {newComment.length}/1000 characters
        </p>
      </div>
    </div>
  );
}
