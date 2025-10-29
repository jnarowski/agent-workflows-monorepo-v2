import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionDropdownMenu } from "@/client/pages/projects/sessions/components/SessionDropdownMenu";
import type { SessionResponse } from "@/shared/types";

interface SessionHeaderProps {
  session: SessionResponse;
}

/**
 * Session header bar that displays current session info with dropdown menu
 * Shows agent icon, session name, and actions menu on the far right
 */
export function SessionHeader({ session }: SessionHeaderProps) {
  // Truncate session name to 50 characters
  const truncatedSessionName =
    session.name && session.name.length > 50
      ? session.name.slice(0, 50) + "..."
      : session.name;

  return (
    <div className="flex items-center justify-between gap-1.5 px-4 md:px-6 py-1.5 text-xs text-muted-foreground bg-muted/30 border-b">
      <div className="flex items-center gap-1.5 min-w-0">
        <AgentIcon agent={session.agent} className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{truncatedSessionName}</span>
      </div>

      <div className="shrink-0">
        <SessionDropdownMenu session={session} />
      </div>
    </div>
  );
}
