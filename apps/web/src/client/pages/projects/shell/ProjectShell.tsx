import { Terminal } from "@/client/pages/projects/shell/components/Terminal";
import { ShellControls } from "@/client/pages/projects/shell/components/ShellControls";
import { useShell } from "@/client/pages/projects/shell/contexts/ShellContext";
import { useActiveProject } from "@/client/hooks/navigation";

export default function ProjectShell() {
  const { projectId } = useActiveProject();
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
        onRestart={handleRestart}
      />
      <div className="flex-1 overflow-hidden">
        <Terminal sessionId={sessionId} projectId={projectId!} />
      </div>
    </div>
  );
}
