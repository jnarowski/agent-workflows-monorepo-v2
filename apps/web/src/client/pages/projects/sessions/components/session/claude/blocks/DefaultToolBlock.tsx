/**
 * Default fallback tool block component
 * Used for tools that don't have a custom Block component
 */

import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { ToolResultRenderer } from "../tools/ToolResultRenderer";

interface DefaultToolBlockProps {
  toolName: string;
  input: Record<string, unknown>;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function DefaultToolBlock({
  toolName,
  input,
  result,
}: DefaultToolBlockProps) {
  return (
    <ToolCollapsibleWrapper
      toolName={toolName}
      contextInfo={null}
      description={null}
      hasError={result?.is_error}
    >
      <div className="space-y-3">
        {/* Tool Input */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            Input
          </div>
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
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Output
            </div>
            <div className="border border-border rounded-md p-2 bg-background/50">
              <ToolResultRenderer
                result={result.content}
                isError={result.is_error}
              />
            </div>
          </div>
        )}
      </div>
    </ToolCollapsibleWrapper>
  );
}
