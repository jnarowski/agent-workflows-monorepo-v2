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
import { SessionDialog } from "./SessionDialog";
import { useUpdateSession } from "../hooks/useAgentSessions";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const updateSessionMutation = useUpdateSession();

  const timeAgo = formatDistanceToNow(new Date(lastMessageAt), {
    addSuffix: true,
  });

  // Use session name if available, otherwise fall back to first message preview
  const displayName = session.name || firstMessagePreview || "New session";
  const truncatedName = truncateToChars(displayName);

  const handleClick = () => {
    // Close mobile menu when clicking a session
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    setEditDialogOpen(true);
  };

  const handleUpdateSession = async (sessionId: string, name: string) => {
    await updateSessionMutation.mutateAsync({ id: sessionId, name });
  };

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
              title={displayName}
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
      {(isHovered || isMenuOpen) && (
        <div className="absolute right-2 top-2 z-50">
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger
              className={cn(
                "h-6 w-6 flex items-center justify-center rounded-md transition-colors",
                "bg-background/95 backdrop-blur-sm hover:bg-accent",
                "border border-border/50",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <SessionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        session={session}
        onUpdateSession={handleUpdateSession}
      />
    </div>
  );
}
