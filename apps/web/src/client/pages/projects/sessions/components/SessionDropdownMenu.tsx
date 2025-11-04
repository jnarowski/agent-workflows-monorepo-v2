import { useState } from "react";
import { MoreHorizontal, Pencil, FileJson } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { SessionDialog } from "./SessionDialog";
import { SessionFileViewer } from "./SessionFileViewer";
import { useUpdateSession } from "../hooks/useAgentSessions";
import { cn } from "@/client/utils/cn";
import type { SessionResponse } from "@/shared/types";

interface SessionDropdownMenuProps {
  session: SessionResponse;
  onEditSuccess?: () => void;
  onMenuOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
}

/**
 * Reusable dropdown menu for session actions (rename, etc.)
 * Manages its own state for dialog and menu open/close
 */
export function SessionDropdownMenu({
  session,
  onEditSuccess,
  onMenuOpenChange,
  triggerClassName,
}: SessionDropdownMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const updateSessionMutation = useUpdateSession();

  const handleMenuOpenChange = (open: boolean) => {
    setIsMenuOpen(open);
    onMenuOpenChange?.(open);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMenuOpenChange(false);
    setEditDialogOpen(true);
  };

  const handleViewFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMenuOpenChange(false);
    setFileViewerOpen(true);
  };

  const handleUpdateSession = async (sessionId: string, name: string) => {
    await updateSessionMutation.mutateAsync({ id: sessionId, name });
    onEditSuccess?.();
  };

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded-md transition-colors",
            "bg-background/95 backdrop-blur-sm hover:bg-accent",
            "border border-border/50",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            triggerClassName
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
          {session.session_path && (
            <DropdownMenuItem onClick={handleViewFile}>
              <FileJson className="h-4 w-4" />
              <span>View Session File</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SessionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        session={session}
        onUpdateSession={handleUpdateSession}
      />

      <SessionFileViewer
        open={fileViewerOpen}
        onOpenChange={setFileViewerOpen}
        sessionId={session.id}
      />
    </>
  );
}
