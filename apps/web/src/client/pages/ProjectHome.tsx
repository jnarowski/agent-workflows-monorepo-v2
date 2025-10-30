import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useProjectsWithSessions,
  useProjectReadme,
} from "@/client/pages/projects/hooks/useProjects";
import { SessionListItem } from "@/client/pages/projects/sessions/components/SessionListItem";
import { NewSessionButton } from "@/client/pages/projects/sessions/components/NewSessionButton";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import {
  FolderOpen,
  Calendar,
  MessageSquare,
  FileText,
  Pencil,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { truncatePath } from "@/client/lib/utils";

export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const { data: projectsData, isLoading } = useProjectsWithSessions();
  const project = projectsData?.find((p) => p.id === id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useDocumentTitle(
    project?.name ? `${project.name} | Agent Workflows` : undefined
  );
  const sessions = project?.sessions || [];
  const {
    data: readme,
    isLoading: isLoadingReadme,
    error: readmeError,
  } = useProjectReadme(id!);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight break-words">{project.name}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            className="shrink-0 -mt-1"
          >
            <Pencil className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Edit</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                Project Path
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-muted-foreground font-mono cursor-help break-all">
                      {truncatePath(project.path, typeof window !== 'undefined' && window.innerWidth < 768 ? 30 : 60)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md break-all">
                    <p className="font-mono text-xs">{project.path}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Created
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(project.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions Section */}
      <Card>
        <CardHeader className="flex flex-col gap-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <MessageSquare className="h-5 w-5 shrink-0" />
                <span className="truncate">Recent Sessions</span>
              </CardTitle>
              <CardDescription className="mt-1.5 text-xs md:text-sm">
                Your most recent chat sessions
              </CardDescription>
            </div>
          </div>
          <NewSessionButton
            projectId={id!}
            variant="outline"
            size="sm"
            className="w-full text-sm"
          />
        </CardHeader>
        <CardContent className="pt-0">
          {!sessions || sessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No sessions yet. Start a new chat to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-0 -mx-2">
              {sessions
                .sort(
                  (a, b) =>
                    new Date(b.metadata.lastMessageAt).getTime() -
                    new Date(a.metadata.lastMessageAt).getTime()
                )
                .slice(0, 10)
                .map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    projectId={id!}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* README Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">Project README</span>
          </CardTitle>
          {readme?.path && project && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardDescription className="font-mono text-xs cursor-help break-all">
                    {truncatePath(`${project.path}/${readme.path}`, typeof window !== 'undefined' && window.innerWidth < 768 ? 35 : 70)}
                  </CardDescription>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md break-all">
                  <p className="font-mono text-xs">{project.path}/{readme.path}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingReadme ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : readmeError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No README.md found in this project.
              </p>
            </div>
          ) : readme ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {readme.content}
              </ReactMarkdown>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
      />
    </div>
  );
}
