import { AgentIcon } from '@/client/components/AgentIcon';
import { Label } from '@/client/components/ui/label';
import type { AgentType } from '@/shared/types/agent.types';
import { cn } from '@/client/lib/utils';

interface AgentSelectorProps {
  value: AgentType;
  onChange: (agent: AgentType) => void;
  disabled?: boolean;
}

const agents: Array<{
  id: AgentType;
  name: string;
  description: string;
  status: 'available' | 'coming-soon';
}> = [
  {
    id: 'claude',
    name: 'Claude Code',
    description: 'Anthropic Claude - Advanced reasoning and coding',
    status: 'available',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    description: 'OpenAI Codex - Code generation and understanding',
    status: 'available',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google Gemini - Multimodal AI assistant',
    status: 'coming-soon',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Cursor IDE integration',
    status: 'coming-soon',
  },
];

export function AgentSelector({ value, onChange, disabled }: AgentSelectorProps) {
  return (
    <div className="space-y-2">
      {agents.map((agent) => (
        <button
          key={agent.id}
          type="button"
          onClick={() => {
            if (agent.status === 'available' && !disabled) {
              onChange(agent.id);
            }
          }}
          disabled={disabled || agent.status === 'coming-soon'}
          className={cn(
            'flex w-full items-start space-x-3 rounded-lg border p-3 text-left transition-colors',
            agent.status === 'coming-soon' && 'opacity-50 cursor-not-allowed',
            agent.status === 'available' && !disabled && 'cursor-pointer hover:bg-accent',
            value === agent.id && agent.status === 'available' && 'border-primary bg-accent',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <div
            className={cn(
              'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border',
              value === agent.id && agent.status === 'available'
                ? 'border-primary'
                : 'border-input'
            )}
          >
            {value === agent.id && agent.status === 'available' && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <Label
            className={cn(
              'flex-1 cursor-pointer',
              agent.status === 'coming-soon' && 'cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <AgentIcon agent={agent.id} className="h-4 w-4" />
              <span className="font-medium text-sm">{agent.name}</span>
              {agent.status === 'coming-soon' && (
                <span className="text-xs text-muted-foreground">
                  (Coming Soon)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {agent.description}
            </p>
          </Label>
        </button>
      ))}
    </div>
  );
}
