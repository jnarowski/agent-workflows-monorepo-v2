"use client";

import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Clock,
  Folder,
  Plus,
  MoreHorizontal,
  Trash2,
  Star,
  Edit,
  Forward,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProjects } from "../hooks/useProjects";

interface Session {
  id: string;
  name: string;
  timestamp: string;
  messageCount: number;
}

interface ProjectWithSessions {
  id: string;
  name: string;
  path: string;
  sessionCount: number;
  sessions?: Session[];
  isActive?: boolean;
}

interface AppInnerSidebarProps {
  title?: string;
  activeProjectId?: string;
  onProjectClick?: (projectId: string) => void;
  onSessionClick?: (projectId: string, sessionId: string) => void;
  onNewSession?: (projectId: string) => void;
}

export function AppInnerSidebar({
  title,
  activeProjectId: activeProjectIdProp,
  onProjectClick,
  onSessionClick,
  onNewSession,
}: AppInnerSidebarProps) {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const { data: projectsData, isLoading, error } = useProjects();
  const { isMobile } = useSidebar();

  // Use URL param if available, otherwise use prop
  const activeProjectId = params.id || activeProjectIdProp;

  const [openProjects, setOpenProjects] = React.useState<string[]>(
    activeProjectId ? [activeProjectId] : []
  );

  // Transform projects data and add mock sessions for now
  const projects: ProjectWithSessions[] = React.useMemo(() => {
    if (!projectsData) return [];

    return projectsData.map((project, index) => ({
      id: project.id,
      name: project.name,
      path: project.path,
      sessionCount: index === 0 ? 2 : Math.floor(Math.random() * 5), // Mock session count
      sessions:
        index === 0
          ? [
              // Mock sessions for first project
              {
                id: "s1",
                name: "Warmup",
                timestamp: "7 hours ago",
                messageCount: 97,
              },
              {
                id: "s2",
                name: "Caveat: The messages below were gene...",
                timestamp: "8 hours ago",
                messageCount: 7,
              },
            ]
          : [],
    }));
  }, [projectsData]);

  // Get active project name for title
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const displayTitle = title || activeProject?.name || "Projects";

  const toggleProject = (projectId: string) => {
    // Always ensure the project is open when navigating to it
    setOpenProjects((prev) =>
      prev.includes(projectId) ? prev : [...prev, projectId]
    );
    onProjectClick?.(projectId);
    navigate(`/projects/${projectId}/chat`);
  };

  // Ensure active project is open on mount or when activeProjectId changes
  React.useEffect(() => {
    if (activeProjectId && !openProjects.includes(activeProjectId)) {
      setOpenProjects((prev) => [...prev, activeProjectId]);
    }
  }, [activeProjectId]);

  return (
    <Sidebar collapsible="none" className="hidden flex-1 md:flex">
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">
            {displayTitle}
          </div>
        </div>
        <SidebarInput placeholder="Type to search..." />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>All Projects</SidebarGroupLabel>
          {isLoading && (
            <div className="px-2 py-1 text-sm text-muted-foreground">
              Loading projects...
            </div>
          )}
          {error && (
            <div className="px-2 py-1 text-sm text-destructive">
              Error loading projects: {error.message}
            </div>
          )}
          {!isLoading && !error && (
            <SidebarMenu>
              {projects.map((project) => {
                const isOpen = openProjects.includes(project.id);
                const isActive = project.id === activeProjectId;

                return (
                  <Collapsible
                    key={project.id}
                    open={isOpen}
                    onOpenChange={() => toggleProject(project.id)}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <CollapsibleTrigger className="w-full">
                          <Folder />
                          <div className="flex flex-1 flex-col items-start gap-0.5">
                            <span className="font-medium text-sm">
                              {project.name}
                            </span>
                          </div>
                          <ChevronRight
                            className={`ml-auto transition-transform ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          />
                        </CollapsibleTrigger>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction showOnHover>
                            <MoreHorizontal />
                            <span className="sr-only">More</span>
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="w-48 rounded-lg"
                          side={isMobile ? "bottom" : "right"}
                          align={isMobile ? "end" : "start"}
                        >
                          <DropdownMenuItem>
                            <Star className="text-muted-foreground" />
                            <span>Favorite</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="text-muted-foreground" />
                            <span>Edit Project</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Forward className="text-muted-foreground" />
                            <span>Share Project</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Trash2 className="text-muted-foreground" />
                            <span>Delete Project</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <CollapsibleContent>
                        {project.sessions && project.sessions.length > 0 && (
                          <div className="ml-0 space-y-0.5 border-l pl-1 py-1">
                            {project.sessions.map((session) => (
                              <SidebarMenuButton
                                key={session.id}
                                onClick={() =>
                                  onSessionClick?.(project.id, session.id)
                                }
                                className="w-full justify-start h-auto py-2"
                              >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-orange-500 text-white text-xs">
                                  ✱
                                </div>
                                <div className="flex flex-1 flex-col items-start gap-0.5 min-w-0">
                                  <span className="text-sm font-medium line-clamp-1">
                                    {session.name}
                                  </span>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{session.timestamp}</span>
                                  </div>
                                </div>
                                <span className="text-sm font-medium shrink-0">
                                  {session.messageCount}
                                </span>
                              </SidebarMenuButton>
                            ))}
                            <div className="px-2 pt-1">
                              <Button
                                onClick={() => onNewSession?.(project.id)}
                                className="w-full h-7 bg-blue-600 hover:bg-blue-700 text-xs px-2"
                                size="sm"
                              >
                                <Plus className="h-3 w-3" />
                                New Session
                              </Button>
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
