import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/client/contexts/AuthContext";
import { ChatProvider } from "@/client/contexts/ChatContext";
import { useSyncProjects } from "@/client/hooks/useProjects";
import { AppSidebar } from "@/client/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/client/components/ui/sidebar";

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const syncProjects = useSyncProjects();

  // Sync projects from Claude CLI on mount
  useEffect(() => {
    syncProjects.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run once on mount

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ChatProvider>
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
    </ChatProvider>
  );
}

export default ProtectedLayout;
