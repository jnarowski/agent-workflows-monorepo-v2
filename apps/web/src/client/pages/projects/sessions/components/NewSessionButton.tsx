import { useNavigate } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import { ButtonGroup } from "@/client/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Plus, ChevronDown } from "lucide-react";
import { useSidebar } from "@/client/components/ui/sidebar";
import { AgentIcon } from "@/client/components/AgentIcon";
import type { AgentType } from "@/shared/types/agent.types";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";

interface NewSessionButtonProps {
  projectId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const availableAgents: Array<{
  id: AgentType;
  name: string;
}> = [
  { id: 'claude', name: 'Claude Code' },
  { id: 'codex', name: 'OpenAI Codex' },
];

export function NewSessionButton({
  projectId,
  variant = "default",
  size = "default",
}: NewSessionButtonProps) {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const setAgent = useSessionStore((s) => s.setAgent);

  const handleCreateSession = (agent: AgentType = 'claude') => {
    // Set agent in store, then navigate
    setAgent(agent);
    navigate(`/projects/${projectId}/session/new`);
    // Close mobile menu when creating a new session
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <ButtonGroup className="w-full">
      <Button
        onClick={() => handleCreateSession('claude')}
        variant={variant}
        size={isMobile ? "lg" : size}
        className="flex-1 rounded-r-none"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Session
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={isMobile ? "lg" : size}
            className="px-2 rounded-l-none border-l"
          >
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">More agents</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableAgents.map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => handleCreateSession(agent.id)}
            >
              <AgentIcon agent={agent.id} className="h-4 w-4" />
              <span>{agent.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
