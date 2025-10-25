/**
 * Bash tool block component
 */

import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { BashToolRenderer } from "../tools/BashToolRenderer";
import { ToolResultRenderer } from "../tools/ToolResultRenderer";
import type { BashToolInput } from "@/shared/types/tool.types";

interface BashToolBlockProps {
  input: BashToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function BashToolBlock({ input, result }: BashToolBlockProps) {
  // Use description as summary in header
  const description = input.description || null;

  return (
    <ToolCollapsibleWrapper
      toolName="Bash"
      contextInfo={null}
      description={description}
      hasError={result?.is_error}
    >
      {/* IN section - Command */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">IN</div>
        <div className="border border-border rounded-md p-2 bg-background/50">
          <BashToolRenderer input={input} />
        </div>
      </div>

      {/* OUT section - Result */}
      {result && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">OUT</div>
          <div className="border border-border rounded-md p-2 bg-background/50">
            <ToolResultRenderer
              result={result.content}
              isError={result.is_error}
            />
          </div>
        </div>
      )}
    </ToolCollapsibleWrapper>
  );
}
