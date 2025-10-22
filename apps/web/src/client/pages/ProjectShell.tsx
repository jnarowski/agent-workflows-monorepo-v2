import { useParams } from "react-router-dom";
import { useProject } from "@/client/hooks/useProjects";
import { Terminal } from "@/client/components/terminal/Terminal";
import { ShellControls } from "@/client/components/terminal/ShellControls";
import { useShell } from "@/client/contexts/ShellContext";

export default function ProjectShell() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id!);
  const { getSession } = useShell();

  const sessionId = `shell-${id}`;
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
        <Terminal sessionId={sessionId} projectId={id!} />
      </div>
    </div>
  );
}
