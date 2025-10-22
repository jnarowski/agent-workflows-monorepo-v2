"use client";

import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Folder,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProjects } from "../hooks/useProjects";
import { useAgentSessions } from "../hooks/useAgentSessions";
import { SessionListItem } from "./chat/SessionListItem";
import { NewSessionButton } from "./chat/NewSessionButton";

interface ProjectWithSessions {
  id: string;
  name: string;
  path: string;
  sessionCount: number;
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
  const [showAllSessions, setShowAllSessions] = React.useState<{
    [projectId: string]: boolean;
  }>({});

  // Fetch sessions for the active project
  const { data: sessionsData } = useAgentSessions({
    projectId: activeProjectId || "",
    enabled: !!activeProjectId,
  });

  // Transform projects data with real session counts and sort alphabetically
  const projects: ProjectWithSessions[] = React.useMemo(() => {
    if (!projectsData) return [];

    return projectsData
      .map((project) => ({
        id: project.id,
        name: project.name,
        path: project.path,
        sessionCount:
          project.id === activeProjectId ? sessionsData?.length || 0 : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projectsData, activeProjectId, sessionsData]);

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
                        <div className="ml-0 space-y-0.5 border-l pl-1 py-1">
                          {isActive &&
                          sessionsData &&
                          sessionsData.length > 0 ? (
                            <>
                              {(showAllSessions[project.id]
                                ? sessionsData
                                : sessionsData.slice(0, 5)
                              ).map((session) => (
                                <SessionListItem
                                  key={session.id}
                                  session={session}
                                  projectId={project.id}
                                  isActive={false}
                                />
                              ))}
                              {sessionsData.length > 5 &&
                                !showAllSessions[project.id] && (
                                  <button
                                    onClick={() =>
                                      setShowAllSessions((prev) => ({
                                        ...prev,
                                        [project.id]: true,
                                      }))
                                    }
                                    className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                                  >
                                    Show {sessionsData.length - 5} more...
                                  </button>
                                )}
                            </>
                          ) : isActive ? (
                            <div className="px-2 py-2 text-xs text-muted-foreground">
                              No sessions yet
                            </div>
                          ) : null}
                          {isActive && (
                            <div className="px-2 pt-1">
                              <NewSessionButton
                                projectId={project.id}
                                variant="default"
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
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
