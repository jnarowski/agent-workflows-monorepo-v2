import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../hooks/useProjects";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { AlertCircle, ArrowLeft, MessageSquare, Terminal as TerminalIcon } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Terminal } from "../components/terminal/Terminal";
import { ShellControls } from "../components/terminal/ShellControls";
import { useShell } from "../contexts/ShellContext";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(id!);
  const { getSession } = useShell();

  const sessionId = `shell-${id}`;
  const session = getSession(sessionId);

  const handleRestart = () => {
    window.location.reload();
  };

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
    <Tabs defaultValue="chat" className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold text-muted-foreground">Project</div>
          <div className="text-base font-medium">{project.name}</div>
        </div>
        <TabsList>
          <TabsTrigger value="chat">
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="shell">
            <TerminalIcon className="mr-2 h-4 w-4" />
            Shell
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="chat" className="flex-1 p-4 m-0">
        <div className="text-muted-foreground">Chat content coming soon...</div>
      </TabsContent>
      <TabsContent value="shell" className="flex-1 m-0 flex-col data-[state=inactive]:hidden" forceMount={true}>
        <ShellControls
          status={session?.status || 'disconnected'}
          projectName={project.name}
          onRestart={handleRestart}
        />
        <div className="flex-1 overflow-hidden">
          <Terminal sessionId={sessionId} projectId={id!} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
