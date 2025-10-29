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
  FolderOpen,
  Calendar,
  MessageSquare,
  FileText,
  Pencil,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";

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
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            className="shrink-0"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                Project Path
              </div>
              <div className="text-xs text-muted-foreground break-all font-mono">
                {project.path}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Sessions
            </CardTitle>
            <CardDescription className="mt-1">
              Your most recent chat sessions
            </CardDescription>
          </div>
          <NewSessionButton
            projectId={id!}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
          />
        </CardHeader>
        <CardContent>
          {!sessions || sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions yet. Start a new chat to see it here.
            </p>
          ) : (
            <div className="space-y-1">
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
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project README
          </CardTitle>
          {readme?.path && project && (
            <CardDescription className="font-mono text-xs">
              {project.path}/{readme.path}
            </CardDescription>
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
            <p className="text-sm text-muted-foreground">
              No README.md found in this project.
            </p>
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
