import { useMemo, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import {
  Home,
  MessageSquare,
  Terminal as TerminalIcon,
  FileText,
  ChevronDown,
  GitBranch,
  Settings,
} from "lucide-react";
import { Separator } from "@/client/components/ui/separator";
import { SidebarTrigger } from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import type { SessionResponse } from "@/shared/types";
import { AgentIcon } from "@/client/components/AgentIcon";
import { GitOperationsModal } from "@/client/components/GitOperationsModal";

interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
  projectPath: string;
  currentBranch?: string;
  currentSession?: SessionResponse | null;
}

export function ProjectHeader({ projectId, projectName, projectPath, currentBranch, currentSession }: ProjectHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [gitModalOpen, setGitModalOpen] = useState(false);

  // Truncate session name to 50 characters
  const truncatedSessionName = currentSession?.name && currentSession.name.length > 50
    ? currentSession.name.slice(0, 50) + "..."
    : currentSession?.name;

  // Define navigation items
  const navItems = useMemo(
    () => [
      { to: `/projects/${projectId}`, label: "Home", icon: Home, end: true },
      {
        to: `/projects/${projectId}/session/new`,
        label: "Session",
        icon: MessageSquare,
      },
      {
        to: `/projects/${projectId}/shell`,
        label: "Shell",
        icon: TerminalIcon,
      },
      { to: `/projects/${projectId}/files`, label: "Files", icon: FileText },
      {
        to: `/projects/${projectId}/source-control`,
        label: "Git",
        icon: GitBranch,
      },
    ],
    [projectId]
  );

  // Get current active nav item
  const activeNavItem = useMemo(() => {
    return (
      navItems.find((item) => {
        if (item.end) {
          return location.pathname === item.to;
        }
        return location.pathname.startsWith(item.to);
      }) || navItems[0]
    );
  }, [location.pathname, navItems]);

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 md:px-6 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="md:hidden shrink-0" />
          <Separator orientation="vertical" className="md:hidden h-4 shrink-0" />
          <div className="flex flex-col gap-1 min-w-0">
            <div className="text-base font-medium truncate">{projectName}</div>
            {currentBranch && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                <span className="truncate">{currentBranch}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-muted/50"
                  onClick={() => setGitModalOpen(true)}
                  title="Git operations"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop navigation - tabs */}
        <nav className="hidden md:flex gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile navigation - dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="md:hidden">
            <Button variant="outline" size="sm" className="gap-1">
              <activeNavItem.icon className="h-4 w-4" />
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item === activeNavItem;
              return (
                <DropdownMenuItem
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={isActive ? "bg-secondary" : ""}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Session name bar - separate div below header */}
      {currentSession && (
        <div className="flex items-center gap-1.5 px-4 md:px-6 py-1.5 text-xs text-muted-foreground bg-muted/30 border-b">
          <AgentIcon agent={currentSession.agent} className="h-3.5 w-3.5" />
          <span className="truncate">{truncatedSessionName}</span>
        </div>
      )}

      {/* Git Operations Modal */}
      <GitOperationsModal
        open={gitModalOpen}
        onOpenChange={setGitModalOpen}
        projectPath={projectPath}
        currentBranch={currentBranch}
      />
    </>
  );
}
