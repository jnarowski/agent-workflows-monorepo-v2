import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { SessionResponse } from '../../../shared/types';
import { cn } from '../../lib/utils';

interface SessionListItemProps {
  session: SessionResponse;
  projectId: string;
  isActive?: boolean;
}

export function SessionListItem({ session, projectId, isActive = false }: SessionListItemProps) {
  const { id, metadata } = session;
  const { firstMessagePreview, lastMessageAt, messageCount, totalTokens } = metadata;

  const timeAgo = formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true });

  return (
    <Link
      to={`/projects/${projectId}/chat/${id}`}
      className={cn(
        'block px-3 py-2 rounded-md transition-colors hover:bg-accent',
        isActive && 'bg-accent'
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none truncate">
          {firstMessagePreview || 'New session'}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{timeAgo}</span>
          <span>{messageCount} messages</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {totalTokens.toLocaleString()} tokens
        </div>
      </div>
    </Link>
  );
}
