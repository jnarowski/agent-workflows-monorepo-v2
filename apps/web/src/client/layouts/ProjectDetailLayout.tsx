import { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useProjectsWithSessions } from "@/client/pages/projects/hooks/useProjects";
import { useActiveSession } from "@/client/hooks/navigation/useActiveSession";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { useNavigationStore } from "@/client/stores/index";
import { ProjectHeader } from "@/client/components/ProjectHeader";

export default function ProjectDetailLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveProject = useNavigationStore((state) => state.setActiveProject);
  const clearNavigation = useNavigationStore((state) => state.clearNavigation);
  const { data: projects, isLoading, error } = useProjectsWithSessions();
  const project = projects?.find(p => p.id === id);

  // Only show session when on a session route
  const { sessionId: activeSessionId } = useParams<{ sessionId: string }>();

  // Try to get session from React Query cache first (for sidebar sessions)
  const { session: cachedSession } = useActiveSession();
  // Fall back to sessionStore for active session (when viewing a session page)
  const activeSession = useSessionStore((s) => s.session);

  // Build current session with proper display name logic
  // Use same display logic as SessionListItem: session.name || firstMessagePreview || "New session"
  const currentSession = activeSessionId ? (
    cachedSession ? {
      ...cachedSession,
      name: cachedSession.name || cachedSession.metadata.firstMessagePreview || "New session"
    } : (activeSession ? {
      id: activeSession.id,
      agent: activeSession.agent,
      name: activeSession.metadata?.firstMessagePreview || "New session",
    } : null)
  ) : null;

  // Sync projectId with navigationStore on mount and when id changes
  useEffect(() => {
    if (id) {
      setActiveProject(id);
    }

    // Cleanup: clear navigation on unmount
    return () => {
      clearNavigation();
    };
  }, [id, setActiveProject, clearNavigation]);

  // Redirect to root if project is not found or deleted
  useEffect(() => {
    if (error) {
      toast.error("Project not found or has been deleted");
      navigate("/", { replace: true });
    }
  }, [error, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Skeleton className="h-12 w-full" />
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  // Error state - return null since we're redirecting via useEffect
  if (error) {
    return null;
  }

  // Not found state
  if (!project) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Project not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader
        projectId={id!}
        projectName={project.name}
        currentBranch={project.current_branch}
        currentSession={currentSession}
      />

      {/* Nested route content */}
      <div className="flex-1 relative">
        <Outlet />
      </div>
    </div>
  );
}
