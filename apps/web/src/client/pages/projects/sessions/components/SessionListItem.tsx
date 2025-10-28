import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil } from "lucide-react";
import type { SessionResponse } from "@/shared/types";
import { cn } from "@/client/lib/utils";
import { AgentIcon } from "@/client/components/AgentIcon";
import { useSidebar } from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { useState } from "react";

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
  const { id, metadata } = session;
  const { firstMessagePreview, lastMessageAt, messageCount } = metadata;
  const { isMobile, setOpenMobile } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(lastMessageAt), {
    addSuffix: true,
  });

  // Truncate session name to 20 characters max
  const truncatedName = firstMessagePreview
    ? truncateToChars(firstMessagePreview)
    : "New session";

  const handleClick = () => {
    // Close mobile menu when clicking a session
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement edit functionality
    console.log("Edit session:", id);
  };

  // Show menu button if hovered OR menu is open
  const showMenu = isHovered || isMenuOpen;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        to={`/projects/${projectId}/session/${id}`}
        onClick={handleClick}
        className={cn(
          "block px-2 py-2 rounded-md transition-colors hover:bg-accent overflow-hidden relative",
          isActive && "bg-accent"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />
        )}
        <div className="flex items-start gap-2 min-w-0">
          <AgentIcon
            agent={session.agent}
            className={cn(
              "h-4 w-4 mt-0.5",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
          <div className="space-y-1 min-w-0 flex-1">
            <div
              className="text-sm font-normal leading-none truncate"
              title={firstMessagePreview || "New session"}
            >
              {truncatedName}
            </div>
            <div className="flex items-center justify-between text-sm md:text-xs text-muted-foreground gap-2">
              <span className="truncate">{timeAgo}</span>
              <span className="shrink-0">{messageCount} messages</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Hover menu */}
      {isHovered && (
        <div className="absolute right-2 top-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "h-6 w-6 flex items-center justify-center rounded-md hover:bg-accent/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
