import { useParams } from "react-router-dom";
import { useProject } from "../hooks/useProjects";
import { Terminal } from "../components/terminal/Terminal";
import { ShellControls } from "../components/terminal/ShellControls";
import { useShell } from "../contexts/ShellContext";

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
