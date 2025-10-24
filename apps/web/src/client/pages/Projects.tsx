import { useNavigate } from "react-router-dom";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/client/components/ui/empty";
import { FolderOpen, Plus, Calendar, FolderGit2, Info } from "lucide-react";
import { useState } from "react";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // Empty state - no projects
  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderGit2 />
            </EmptyMedia>
            <EmptyTitle>No Projects Yet</EmptyTitle>
            <EmptyDescription>
              Get started by creating your first project. Projects help you organize
              your AI workflows, chat sessions, and files in one place.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Project
            </Button>
            <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">Quick Tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Projects can contain multiple chat sessions</li>
                    <li>Each project has its own file explorer and terminal</li>
                    <li>Use projects to separate different codebases or workflows</li>
                  </ul>
                </div>
              </div>
            </div>
          </EmptyContent>
        </Empty>
        <ProjectDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </div>
    );
  }

  // Projects list
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your AI workflow projects
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Tool Instructions Section */}
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Getting Started</CardTitle>
          </div>
          <CardDescription>
            Quick tips to help you work with projects
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Chat Sessions:</strong> Create and manage AI chat sessions for each project</li>
            <li><strong>File Explorer:</strong> Browse and edit project files directly in the browser</li>
            <li><strong>Terminal:</strong> Access a shell terminal for running commands in your project directory</li>
            <li><strong>Slash Commands:</strong> Use <code className="px-1 py-0.5 bg-muted rounded text-xs">/</code> in chat to execute custom commands</li>
          </ul>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
                {project.is_hidden && (
                  <Badge variant="outline" className="text-xs">
                    Hidden
                  </Badge>
                )}
              </div>
              <CardTitle className="mt-3">{project.name}</CardTitle>
              {project.description && (
                <CardDescription className="line-clamp-2">
                  {project.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(project.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground font-mono truncate">
                {project.path}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
