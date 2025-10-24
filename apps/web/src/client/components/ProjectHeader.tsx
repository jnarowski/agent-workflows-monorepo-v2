import { useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import {
  Home,
  MessageSquare,
  Terminal as TerminalIcon,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Separator } from "@/client/components/ui/separator";
import { SidebarTrigger } from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";

interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
}

export function ProjectHeader({ projectId, projectName }: ProjectHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

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
    <div className="flex items-center justify-between border-b px-4 md:px-6 py-4">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="md:hidden shrink-0" />
        <Separator orientation="vertical" className="md:hidden h-4 shrink-0" />
        <div className="flex flex-col gap-1 min-w-0">
          <div className="text-base font-medium truncate">{projectName}</div>
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
          <Button variant="outline" size="sm" className="gap-2">
            <activeNavItem.icon className="h-4 w-4" />
            <span>{activeNavItem.label}</span>
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
  );
}
