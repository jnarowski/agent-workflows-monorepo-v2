import { useEffect, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/client/stores/index";
import { useSyncProjects } from "@/client/pages/projects/hooks/useProjects";
import { useSettings } from "@/client/hooks/useSettings";
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

  // Load settings early so they're available for all protected routes
  // Settings are cached by TanStack Query (5-minute stale time)
  useSettings();

  // Track if sync has been initiated to prevent duplicate calls in React Strict Mode
  const syncInitiatedRef = useRef(false);

  // Sync projects from Claude CLI on mount (only if needed based on localStorage)
  useEffect(() => {
    // Skip if already initiated (handles React Strict Mode double-invocation)
    if (syncInitiatedRef.current) {
      return;
    }

    if (shouldSyncProjects(user?.id)) {
      if (import.meta.env.DEV) {
        console.log("Syncing projects from Claude CLI...");
      }

      // Mark as initiated immediately to prevent duplicate calls
      syncInitiatedRef.current = true;

      // syncProjects.mutate(undefined, {
      //   onSuccess: () => {
      //     markProjectsSynced(user?.id);
      //   },
      //   onError: () => {
      //     // Reset ref on error so user can retry
      //     syncInitiatedRef.current = false;
      //   },
      // });
    } else {
      if (import.meta.env.DEV) {
        console.log("Skipping project sync - recently synced");
      }
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
