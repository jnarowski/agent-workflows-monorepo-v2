/**
 * Grep tool block component
 */

import { Search } from 'lucide-react';
import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';
import { ToolResultRenderer } from '../tools/ToolResultRenderer';
import type { GrepToolInput } from '@/shared/types/tool.types';

interface GrepToolBlockProps {
  input: GrepToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function GrepToolBlock({ input, result }: GrepToolBlockProps) {
  return (
    <ToolCollapsibleWrapper
      icon={Search}
      toolName="Grep"
      contextInfo={input.pattern}
    >
      {/* Tool Input */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Input:</div>
        <div className="text-sm font-mono bg-muted/50 px-3 py-2 rounded-md border">
          <div className="text-muted-foreground">Pattern:</div>
          <div>{input.pattern}</div>
          {input.path && (
            <>
              <div className="text-muted-foreground mt-2">Path:</div>
              <div>{input.path}</div>
            </>
          )}
        </div>
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
