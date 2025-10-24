/**
 * Bash tool block component
 */

import { Terminal } from 'lucide-react';
import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';
import { BashToolRenderer } from '../tools/BashToolRenderer';
import { ToolResultRenderer } from '../tools/ToolResultRenderer';
import type { BashToolInput } from '@/shared/types/tool.types';

interface BashToolBlockProps {
  input: BashToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function BashToolBlock({ input, result }: BashToolBlockProps) {
  // Show description or truncated command
  const getContextInfo = (): string | null => {
    if (input.description) return input.description;
    if (input.command && input.command.length <= 40) return input.command;
    return null;
  };

  return (
    <ToolCollapsibleWrapper
      icon={Terminal}
      toolName="Bash"
      contextInfo={getContextInfo()}
    >
      {/* Tool Input */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Input:</div>
        <BashToolRenderer input={input} />
      </div>

      {/* Tool Result */}
      {result && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Output:</div>
          <ToolResultRenderer result={result.content} isError={result.is_error} />
        </div>
      )}
    </ToolCollapsibleWrapper>
  );
}
