import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/client/stores/index";
import { useSyncProjects, projectKeys } from "@/client/pages/projects/hooks/useProjects";
import { useSettings } from "@/client/hooks/useSettings";
import { AppSidebar } from "@/client/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/client/components/ui/sidebar";

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  // Load settings early so they're available for all protected routes
  // Settings are cached by TanStack Query (5-minute stale time)
  useSettings();

  // Sync projects from Claude CLI on mount
  // TanStack Query handles caching automatically (5-minute stale time)
  const { data: syncResult, isSuccess } = useSyncProjects();

  // Invalidate projects list when sync completes successfully
  useEffect(() => {
    if (isSuccess && syncResult) {
      // Invalidate projects list to show newly synced projects
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() });

      if (import.meta.env.DEV) {
        console.log(
          `Projects synced: ${syncResult.projectsImported} imported, ${syncResult.projectsUpdated} updated`
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, syncResult]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default ProtectedLayout;
