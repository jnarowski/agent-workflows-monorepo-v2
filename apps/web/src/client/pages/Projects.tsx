import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useSyncProjects } from "@/client/pages/projects/hooks/useProjects";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { AlertCircle, FolderOpen, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import { DeleteProjectDialog } from "@/client/pages/projects/components/DeleteProjectDialog";
import type { Project } from "@/shared/types/project.types";
import { useAuthStore } from "@/client/stores/index";
import { markProjectsSynced } from "@/client/lib/projectSync";

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects, isLoading, error } = useProjects();
  const syncProjects = useSyncProjects();
  const user = useAuthStore((state) => state.user);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const handleManualSync = () => {
    syncProjects.mutate(undefined, {
      onSuccess: () => {
        markProjectsSynced(user?.id);
      },
    });
  };

  // Filter out hidden projects
  const visibleProjects = projects?.filter(project => !project.is_hidden) ?? [];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
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
        <h1 className="text-3xl font-bold">Projects</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || "Failed to load projects. Please try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state
  if (!visibleProjects || visibleProjects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Projects</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleManualSync}
              disabled={syncProjects.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncProjects.isPending ? 'animate-spin' : ''}`} />
              Sync Projects
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Get started by creating your first project. Select a folder from your local
              filesystem to begin.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Project
            </Button>
          </CardContent>
        </Card>

        <ProjectDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </div>
    );
  }

  // Projects list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualSync}
            disabled={syncProjects.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncProjects.isPending ? 'animate-spin' : ''}`} />
            Sync Projects
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            Manage your local project directories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProjects.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <TableCell className="font-medium whitespace-nowrap">{project.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono max-w-md">
                    <span title={project.path} className="break-all">
                      {project.path}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(project.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingProject(project);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <ProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {editingProject && (
        <ProjectDialog
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
          project={editingProject}
        />
      )}

      {/* Delete Dialog */}
      {deletingProject && (
        <DeleteProjectDialog
          open={!!deletingProject}
          onOpenChange={(open) => !open && setDeletingProject(null)}
          project={deletingProject}
        />
      )}
    </div>
  );
}
