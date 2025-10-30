import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { SessionResponse } from "@/shared/types";
import { cn } from "@/client/lib/utils";
import { AgentIcon } from "@/client/components/AgentIcon";
import { useSidebar } from "@/client/components/ui/sidebar";
import { useState } from "react";
import { SessionDropdownMenu } from "./SessionDropdownMenu";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";

interface SessionListItemProps {
  session: SessionResponse;
  projectId: string;
  isActive?: boolean;
}

/**
 * Truncates text to a specified number of characters
 */
function truncateToChars(text: string, maxChars: number = 30): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return trimmed.slice(0, maxChars) + "...";
}

export function SessionListItem({
  session,
  projectId,
  isActive = false,
}: SessionListItemProps) {
  const { id, metadata, created_at } = session;
  const { messageCount } = metadata;
  const { isMobile, setOpenMobile } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });

  // Use utility function for consistent session naming
  const displayName = getSessionDisplayName(session);
  const truncatedName = truncateToChars(displayName);

  const handleClick = () => {
    // Close mobile menu when clicking a session
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      <Link
        to={`/projects/${projectId}/session/${id}`}
        onClick={handleClick}
        className={cn(
          "block px-2 py-2 rounded-t-md overflow-hidden relative border-b transition-all",
          isActive
            ? "border-b-primary/30 border-b font-semibold"
            : "border-b-border/30"
        )}
      >
        <div className="flex items-start gap-2 min-w-0">
          <AgentIcon
            agent={session.agent}
            className={cn(
              "h-4 w-4 mt-0.5",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="text-sm leading-none">
              <span className="truncate" title={displayName}>
                {truncatedName}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm md:text-xs text-muted-foreground gap-2">
              <span className="truncate">{timeAgo}</span>
              <span className="shrink-0">{messageCount} messages</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Hover menu - hidden on mobile */}
      {!isMobile && (isHovered || isMenuOpen) && (
        <div className="absolute right-2 top-2 z-50">
          <SessionDropdownMenu
            session={session}
            onMenuOpenChange={setIsMenuOpen}
          />
        </div>
      )}
    </div>
  );
}
