import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChatProvider } from "../contexts/ChatContext";
import { useSyncProjects } from "../hooks/useProjects";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const syncProjects = useSyncProjects();

  // Sync projects from Claude CLI on mount
  useEffect(() => {
    syncProjects.mutate();
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
