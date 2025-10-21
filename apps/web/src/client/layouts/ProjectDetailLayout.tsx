import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useProject } from "../hooks/useProjects";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  Terminal as TerminalIcon,
  FileText,
} from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";

export default function ProjectDetailLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(id!);

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

  // Error state
  if (error) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || "Failed to load project. Please try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
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
      {/* Header with project name and tab navigation */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold text-muted-foreground">
            Project
          </div>
          <div className="text-base font-medium">{project.name}</div>
        </div>
        <nav className="flex gap-2">
          <NavLink
            to={`/projects/${id}/chat`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`
            }
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </NavLink>
          <NavLink
            to={`/projects/${id}/shell`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`
            }
          >
            <TerminalIcon className="h-4 w-4" />
            Shell
          </NavLink>
          <NavLink
            to={`/projects/${id}/files`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`
            }
          >
            <FileText className="h-4 w-4" />
            Files
          </NavLink>
        </nav>
      </div>

      {/* Nested route content */}
      <div className="flex-1 relative">
        <Outlet />
      </div>
    </div>
  );
}
