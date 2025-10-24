/**
 * Default fallback tool block component
 * Used for tools that don't have a custom Block component
 */

import { Wrench } from 'lucide-react';
import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';
import { ToolResultRenderer } from '../tools/ToolResultRenderer';

interface DefaultToolBlockProps {
  toolName: string;
  input: Record<string, unknown>;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function DefaultToolBlock({ toolName, input, result }: DefaultToolBlockProps) {
  return (
    <ToolCollapsibleWrapper
      icon={Wrench}
      toolName={toolName}
      contextInfo={null}
    >
      {/* Tool Input */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Input:</div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View input
          </summary>
          <pre className="mt-2 p-3 rounded-md bg-muted/50 border overflow-x-auto text-xs">
            {JSON.stringify(input, null, 2)}
          </pre>
        </details>
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
