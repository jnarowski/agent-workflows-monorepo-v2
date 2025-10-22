import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/client/stores";
import { useSyncProjects } from "@/client/hooks/useProjects";
import { AppSidebar } from "@/client/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/client/components/ui/sidebar";

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const syncProjects = useSyncProjects();

  // Sync projects from Claude CLI on mount
  useEffect(() => {
    console.log("Syncing project.......");
    syncProjects.mutate();
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
