import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';

interface SlashCommandBlockProps {
  command: string;
  message?: string;
  args?: string;
}

/**
 * Renders slash command execution blocks
 * SDK extracts these from user messages with <command-name> tags
 */
export function SlashCommandBlock({ command, message, args }: SlashCommandBlockProps) {
  return (
    <ToolCollapsibleWrapper
      toolName={`/${command}`}
      contextInfo={args}
      description={message || 'Running slash command'}
    >
      <div className="space-y-2 text-sm font-mono">
        <div className="text-muted-foreground">
          Command: <span className="text-foreground">/{command}</span>
          {args && <span className="text-foreground ml-2">{args}</span>}
        </div>
        {message && (
          <div className="text-xs text-muted-foreground border-l-2 pl-2">
            {message}
          </div>
        )}
      </div>
    </ToolCollapsibleWrapper>
  );
}
