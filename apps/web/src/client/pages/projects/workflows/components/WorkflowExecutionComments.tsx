import { Paperclip, FileText, Image, Code, FileIcon } from 'lucide-react';
import type { WorkflowComment, WorkflowArtifact } from '../types';

interface WorkflowExecutionCommentsProps {
  comments: WorkflowComment[];
  executionId: string;
}

export function WorkflowExecutionComments({
  comments,
}: WorkflowExecutionCommentsProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'code':
        return <Code className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };

  const getFileTypeBadgeClass = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'code':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'document':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No comments yet.
      </div>
    );
  }

  // Sort comments by created_at descending (newest first)
  const sortedComments = [...comments].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-4">
      {sortedComments.map((comment) => (
        <div
          key={comment.id}
          className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded ${getCommentTypeBadgeClass(comment.comment_type)}`}>
                  {comment.comment_type.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(comment.created_at)}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>

              {/* Attachments */}
              {comment.artifacts && comment.artifacts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    <span>{comment.artifacts.length} {comment.artifacts.length === 1 ? 'Attachment' : 'Attachments'}</span>
                  </div>
                  <div className="space-y-2">
                    {comment.artifacts.map((artifact) => (
                      <div
                        key={artifact.id}
                        className="flex items-center gap-3 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className={`p-2 rounded ${getFileTypeBadgeClass(artifact.file_type)}`}>
                          {getFileIcon(artifact.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{artifact.file_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{artifact.file_type}</span>
                            <span>•</span>
                            <span>{formatFileSize(artifact.size_bytes)}</span>
                            <span>•</span>
                            <code className="text-xs">{artifact.file_path}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {comment.created_by && (
                <div className="mt-2 text-xs text-muted-foreground">
                  By: {comment.created_by}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
