import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../hooks/useProjects";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { AlertCircle, ArrowLeft, FolderOpen, Pencil, Trash2, Calendar, FolderGit2 } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { ProjectDialog } from "../components/projects/ProjectDialog";
import { DeleteProjectDialog } from "../components/projects/DeleteProjectDialog";
import type { Project } from "../../shared/types/project.types";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(id!);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
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
      <div className="space-y-4">
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
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{project.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Project Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5" />
            Project Details
          </CardTitle>
          <CardDescription>
            View and manage your project information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Name</div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">{project.name}</span>
            </div>
          </div>

          {/* Project Path */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Path</div>
            <div className="rounded-lg bg-muted p-3 font-mono text-sm break-all">
              {project.path}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created
              </div>
              <div className="text-sm">
                {new Date(project.created_at).toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Updated
              </div>
              <div className="text-sm">
                {new Date(project.updated_at).toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}
              </div>
            </div>
          </div>

          {/* Project ID (for debugging/reference) */}
          <div className="space-y-2 pt-4 border-t">
            <div className="text-sm font-medium text-muted-foreground">Project ID</div>
            <div className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded">
              {project.id}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ProjectDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        project={project}
      />

      {/* Delete Dialog */}
      <DeleteProjectDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        project={project}
        onSuccess={() => navigate("/projects")}
      />
    </div>
  );
}
