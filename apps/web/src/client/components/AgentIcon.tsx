import type { AgentType } from "@/shared/types/agent.types";
import { cn } from "@/client/lib/utils";
import claudeSvg from "@/client/assets/icons/agents/claude.svg";
import codexSvg from "@/client/assets/icons/agents/codex.svg";
import geminiSvg from "@/client/assets/icons/agents/gemini.svg";
import cursorSvg from "@/client/assets/icons/agents/cursor.svg";

interface AgentIconProps {
  agent: AgentType;
  className?: string;
}

const ClaudeIcon = ({ className }: { className?: string }) => (
  <img src={claudeSvg} alt="Claude" className={className} />
);

const CodexIcon = ({ className }: { className?: string }) => (
  <img src={codexSvg} alt="Codex" className={className} />
);

const GeminiIcon = ({ className }: { className?: string }) => (
  <img src={geminiSvg} alt="Gemini" className={className} />
);

const CursorIcon = ({ className }: { className?: string }) => (
  <img src={cursorSvg} alt="Cursor" className={className} />
);

/**
 * Displays the appropriate icon for each AI agent type
 */
export function AgentIcon({ agent, className }: AgentIconProps) {
  const iconMap: Record<
    AgentType,
    React.ComponentType<{ className?: string }>
  > = {
    claude: ClaudeIcon,
    codex: CodexIcon,
    gemini: GeminiIcon,
    cursor: CursorIcon,
  };

  const Icon = iconMap[agent];

  return <Icon className={cn("shrink-0", className)} />;
}
