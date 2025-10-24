import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/client/stores";
import { useSyncProjects } from "@/client/pages/projects/hooks/useProjects";
import { AppSidebar } from "@/client/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/client/components/ui/sidebar";
import {
  shouldSyncProjects,
  markProjectsSynced,
} from "@/client/lib/projectSync";

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const syncProjects = useSyncProjects();

  // Sync projects from Claude CLI on mount (only if needed based on localStorage)
  useEffect(() => {
    if (shouldSyncProjects(user?.id)) {
      console.log("Syncing projects from Claude CLI...");
      syncProjects.mutate(undefined, {
        onSuccess: () => {
          markProjectsSynced(user?.id);
        },
      });
    } else {
      console.log("Skipping project sync - recently synced");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run once on mount

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
