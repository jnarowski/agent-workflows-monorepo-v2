import { useParams } from "react-router-dom";
import { useProject, useProjectReadme } from "@/client/pages/projects/hooks/useProjects";
import { useAgentSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { SessionListItem } from "@/client/pages/projects/sessions/components/SessionListItem";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { FolderOpen, Calendar, MessageSquare, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id!);
  const { data: sessions, isLoading: isLoadingSessions } = useAgentSessions({
    projectId: id!,
    enabled: !!id
  });
  const { data: readme, isLoading: isLoadingReadme, error: readmeError } = useProjectReadme(id!);

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
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-2">{project.description}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Path</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground break-all font-mono">
              {project.path}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {new Date(project.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Sessions
            </CardTitle>
            <CardDescription>
              Your most recent chat sessions
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSessions ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions yet. Start a new chat to see it here.
            </p>
          ) : (
            <div className="space-y-1">
              {sessions
                .sort((a, b) =>
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
    </div>
  );
}
