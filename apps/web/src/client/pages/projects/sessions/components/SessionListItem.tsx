import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Code } from "lucide-react";
import type { SessionResponse } from "@/shared/types";
import { cn } from "@/client/lib/utils";

interface SessionListItemProps {
  session: SessionResponse;
  projectId: string;
  isActive?: boolean;
}

/**
 * Truncates text to a specified number of words
 */
function truncateToWords(text: string, maxWords: number = 5): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }
  return words.slice(0, maxWords).join(" ") + "...";
}

export function SessionListItem({
  session,
  projectId,
  isActive = false,
}: SessionListItemProps) {
  const { id, metadata } = session;
  const { firstMessagePreview, lastMessageAt, messageCount } = metadata;

  const timeAgo = formatDistanceToNow(new Date(lastMessageAt), {
    addSuffix: true,
  });

  // Truncate session name to 5 words max
  const truncatedName = firstMessagePreview
    ? truncateToWords(firstMessagePreview, 5)
    : "New session";

  return (
    <Link
      to={`/projects/${projectId}/session/${id}`}
      className={cn(
        "block px-2 py-2 rounded-md transition-colors hover:bg-accent overflow-hidden relative",
        isActive && "bg-accent"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />
      )}
      <div className="flex items-start gap-2 min-w-0">
        <Code
          className={cn(
            "h-4 w-4 mt-0.5 shrink-0",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        <div className="space-y-1 min-w-0 flex-1">
          <p
            className="text-sm font-medium leading-none truncate"
            title={firstMessagePreview || "New session"}
          >
            {truncatedName}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
            <span className="truncate">{timeAgo}</span>
            <span className="shrink-0">{messageCount} messages</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
