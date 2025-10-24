"use client";

import { useState, useMemo, useEffect, type MouseEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useActiveProject } from "@/client/hooks/navigation";
import {
  ChevronRight,
  Folder,
  MoreHorizontal,
  Trash2,
  Star,
  Edit,
  Forward,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  useSidebar,
} from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import {
  useProjects,
  useToggleProjectHidden,
} from "@/client/pages/projects/hooks/useProjects";
import { useAgentSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { SessionListItem } from "@/client/pages/projects/sessions/components/SessionListItem";
import { NewSessionButton } from "@/client/pages/projects/sessions/components/NewSessionButton";
import { CommandMenu } from "./CommandMenu";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import type { Project } from "@/shared/types/project.types";

interface AppInnerSidebarProps {
  activeProjectId?: string;
  onProjectClick?: (projectId: string) => void;
  onSessionClick?: (projectId: string, sessionId: string) => void;
  onNewSession?: (projectId: string) => void;
}

export function AppInnerSidebar({
  activeProjectId: activeProjectIdProp,
  onProjectClick,
}: AppInnerSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: activeProjectIdFromHook } = useActiveProject();
  const { data: projectsData, isLoading, error } = useProjects();
  const { isMobile } = useSidebar();

  // Get the current session ID from the URL
  const sessionMatch = location.pathname.match(/\/session\/([^/]+)/);
  const activeSessionId = sessionMatch ? sessionMatch[1] : null;

  // Use navigation hook if available, otherwise use prop
  const activeProjectId = activeProjectIdFromHook || activeProjectIdProp;

  const [searchQuery, setSearchQuery] = useState("");
  const [openProjects, setOpenProjects] = useState<string[]>(
    activeProjectId ? [activeProjectId] : []
  );
  const [showAllSessions, setShowAllSessions] = useState<{
    [projectId: string]: boolean;
  }>({});
  const [isHiddenOpen, setIsHiddenOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | undefined>(
    undefined
  );

  // Fetch sessions for the active project
  const { data: sessionsData } = useAgentSessions({
    projectId: activeProjectId || "",
    enabled: !!activeProjectId,
  });

  // Backend already sorts sessions by created_at (most recent first)
  // Just use the data directly
  const sortedSessions = sessionsData || [];

  const toggleHiddenMutation = useToggleProjectHidden();

  // Transform projects data with real session counts and separate visible/hidden
  const { visibleProjects, hiddenProjects } = useMemo(() => {
    if (!projectsData) return { visibleProjects: [], hiddenProjects: [] };

    const allProjects = projectsData.map((project) => ({
      id: project.id,
      name: project.name,
      path: project.path,
      is_hidden: project.is_hidden,
      created_at: project.created_at,
      updated_at: project.updated_at,
      sessionCount:
        project.id === activeProjectId ? sessionsData?.length || 0 : 0,
    }));

    // Filter by search query
    const filteredProjects = searchQuery
      ? allProjects.filter((p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allProjects;

    const visible = filteredProjects
      .filter((p) => !p.is_hidden)
      .sort((a, b) => a.name.localeCompare(b.name));

    const hidden = filteredProjects
      .filter((p) => p.is_hidden)
      .sort((a, b) => a.name.localeCompare(b.name));

    return { visibleProjects: visible, hiddenProjects: hidden };
  }, [projectsData, activeProjectId, sessionsData, searchQuery]);


  const toggleProject = (projectId: string) => {
    // Always ensure the project is open when navigating to it
    setOpenProjects((prev) =>
      prev.includes(projectId) ? prev : [...prev, projectId]
    );
    onProjectClick?.(projectId);
    navigate(`/projects/${projectId}`);
  };

  const handleToggleHidden = (
    projectId: string,
    is_hidden: boolean,
    e: MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    toggleHiddenMutation.mutate({ id: projectId, is_hidden });
  };

  const handleEditProject = (project: Project, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToEdit(project);
    setEditDialogOpen(true);
  };

  // Ensure active project is open on mount or when activeProjectId changes
  useEffect(() => {
    if (activeProjectId && !openProjects.includes(activeProjectId)) {
      setOpenProjects((prev) => [...prev, activeProjectId]);
    }
  }, [activeProjectId, openProjects]);

  return (
    <Sidebar collapsible="none" className="flex-1">
      <SidebarHeader className="gap-3.5 border-b p-4">
        <CommandMenu onSearchChange={setSearchQuery} />
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
              {visibleProjects.map((project) => {
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
                        <CollapsibleTrigger className="w-full overflow-hidden">
                          <Folder className="shrink-0" />
                          <div className="flex flex-1 flex-col items-start gap-0.5 min-w-0 overflow-hidden">
                            <span className="text-sm truncate block">
                              {project.name.length > 20
                                ? `${project.name.slice(0, 20)}...`
                                : project.name}
                            </span>
                          </div>
                          <ChevronRight
                            className={`ml-auto shrink-0 transition-transform ${
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
                          <DropdownMenuItem
                            onClick={(e) => handleEditProject(project, e)}
                          >
                            <Edit className="text-muted-foreground" />
                            <span>Edit Project</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) =>
                              handleToggleHidden(
                                project.id,
                                !project.is_hidden,
                                e
                              )
                            }
                          >
                            {project.is_hidden ? (
                              <>
                                <Eye className="text-muted-foreground" />
                                <span>Unhide Project</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="text-muted-foreground" />
                                <span>Hide Project</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <CollapsibleContent>
                        <div className="ml-0 space-y-0.5 py-1">
                          {isActive &&
                          sortedSessions &&
                          sortedSessions.length > 0 ? (
                            <>
                              {(showAllSessions[project.id]
                                ? sortedSessions
                                : sortedSessions.slice(0, 5)
                              ).map((session) => (
                                <SessionListItem
                                  key={session.id}
                                  session={session}
                                  projectId={project.id}
                                  isActive={session.id === activeSessionId}
                                />
                              ))}
                              {sortedSessions.length > 5 &&
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
                                    Show {sortedSessions.length - 5} more...
                                  </button>
                                )}
                            </>
                          ) : isActive ? (
                            <div className="px-2 py-2 text-xs text-muted-foreground">
                              No sessions yet
                            </div>
                          ) : null}
                          {isActive && (
                            <div className="px-2 pt-1 pb-5">
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
        {hiddenProjects.length > 0 && (
          <SidebarGroup>
            <Collapsible open={isHiddenOpen} onOpenChange={setIsHiddenOpen}>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full flex items-center justify-between">
                  <span>Hidden ({hiddenProjects.length})</span>
                  <ChevronRight
                    className={`transition-transform ${
                      isHiddenOpen ? "rotate-90" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarMenu>
                  {hiddenProjects.map((project) => {
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
                            <CollapsibleTrigger className="w-full overflow-hidden">
                              <Folder className="shrink-0" />
                              <div className="flex flex-1 flex-col items-start gap-0.5 min-w-0 overflow-hidden">
                                <span className="font-medium text-sm truncate block">
                                  {project.name.length > 50
                                    ? `${project.name.slice(0, 50)}...`
                                    : project.name}
                                </span>
                              </div>
                              <ChevronRight
                                className={`ml-auto shrink-0 transition-transform ${
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
                              <DropdownMenuItem
                                onClick={(e) => handleEditProject(project, e)}
                              >
                                <Edit className="text-muted-foreground" />
                                <span>Edit Project</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) =>
                                  handleToggleHidden(
                                    project.id,
                                    !project.is_hidden,
                                    e
                                  )
                                }
                              >
                                {project.is_hidden ? (
                                  <>
                                    <Eye className="text-muted-foreground" />
                                    <span>Unhide Project</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="text-muted-foreground" />
                                    <span>Hide Project</span>
                                  </>
                                )}
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
                            <div className="ml-0 space-y-0.5">
                              {isActive &&
                              sortedSessions &&
                              sortedSessions.length > 0 ? (
                                <>
                                  {(showAllSessions[project.id]
                                    ? sortedSessions
                                    : sortedSessions.slice(0, 5)
                                  ).map((session) => (
                                    <SessionListItem
                                      key={session.id}
                                      session={session}
                                      projectId={project.id}
                                      isActive={session.id === activeSessionId}
                                    />
                                  ))}
                                  {sortedSessions.length > 5 &&
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
                                        Show {sortedSessions.length - 5} more...
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
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>
      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={projectToEdit}
      />
    </Sidebar>
  );
}
