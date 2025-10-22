import { useProject } from "@/client/hooks/useProjects";
import { Terminal } from "@/client/components/terminal/Terminal";
import { ShellControls } from "@/client/components/terminal/ShellControls";
import { useShell } from "@/client/contexts/ShellContext";
import { useActiveProject } from "@/client/hooks/navigation";

export default function ProjectShell() {
  const { projectId } = useActiveProject();
  const { data: project } = useProject(projectId!);
  const { getSession } = useShell();

  const sessionId = `shell-${projectId}`;
  const session = getSession(sessionId);

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full">
      <ShellControls
        status={session?.status || 'disconnected'}
        projectName={project?.name || ''}
        onRestart={handleRestart}
      />
      <div className="flex-1 overflow-hidden">
        <Terminal sessionId={sessionId} projectId={projectId!} />
      </div>
    </div>
  );
}
