import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { api } from '@/client/lib/api-client';
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
  const { data: project, isLoading, error } = useProject(id!);
  const [, setIsSyncing] = useState(false);

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

  // Sync sessions on initial mount only
  useEffect(() => {
    if (!id) return;

    const syncSessions = async () => {
      try {
        setIsSyncing(true);

        const result = await api.post(`/api/projects/${id}/sessions/sync`);
        if (import.meta.env.DEV) {
          console.log('Sessions synced:', result);
        }
      } catch (err) {
        console.error('Error syncing sessions:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    syncSessions();
  }, [id]); // Only run when project ID changes

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
        currentBranch={project.currentBranch}
      />

      {/* Nested route content */}
      <div className="flex-1 relative">
        <Outlet />
      </div>
    </div>
  );
}
