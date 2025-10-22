import { useState } from 'react';
import { useProjects } from "@/client/hooks/useProjects";
import { Terminal } from "@/client/components/terminal/Terminal";
import { ShellControls } from "@/client/components/terminal/ShellControls";
import { useShell } from "@/client/contexts/ShellContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { AlertCircle, Terminal as TerminalIcon } from 'lucide-react';

export default function Shell() {
  const { data: projects, isLoading, error } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { getSession } = useShell();

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const sessionId = `shell-${selectedProjectId}`;
  const session = getSession(sessionId);

  const handleRestart = () => {
    // Reload page to restart session
    window.location.reload();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 space-y-4">
          <h1 className="text-3xl font-bold">Shell</h1>
          <Skeleton className="h-10 w-64" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full p-4">
        <h1 className="text-3xl font-bold mb-4">Shell</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || 'Failed to load projects. Please try again.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state - no projects
  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col h-full p-4">
        <h1 className="text-3xl font-bold mb-4">Shell</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <TerminalIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Create a project first to use the interactive shell.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No project selected
  if (!selectedProjectId) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 space-y-4">
          <h1 className="text-3xl font-bold">Shell</h1>
          <Card>
            <CardHeader>
              <CardTitle>Select a Project</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Choose a project to start an interactive shell session
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Shell view with terminal
  return (
    <div className="flex flex-col h-full">
      {/* Header with project selector */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Shell</h1>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Controls */}
      <ShellControls
        status={session?.status || 'disconnected'}
        projectName={selectedProject?.name}
        onRestart={handleRestart}
      />

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        <Terminal sessionId={sessionId} projectId={selectedProjectId} />
      </div>
    </div>
  );
}
