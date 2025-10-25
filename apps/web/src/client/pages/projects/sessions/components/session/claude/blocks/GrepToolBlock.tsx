/**
 * Grep tool block component
 */

import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { ToolResultRenderer } from "../tools/ToolResultRenderer";
import type { GrepToolInput } from "@/shared/types/tool.types";

interface GrepToolBlockProps {
  input: GrepToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function GrepToolBlock({ input, result }: GrepToolBlockProps) {
  // Count lines in result
  const getDescription = (): string | null => {
    if (!result || result.is_error) return null;

    const lines = result.content.trim().split("\n");
    const count = lines.filter((line) => line.trim().length > 0).length;

    if (count === 1) {
      return "1 line of output";
    }
    return `${count} lines of output`;
  };

  return (
    <ToolCollapsibleWrapper
      toolName="Grep"
      contextInfo={`"${input.pattern}"`}
      description={getDescription()}
      hasError={result?.is_error}
    >
      <div className="border border-border rounded-md p-2 bg-background/50">
        <ToolResultRenderer
          result={result?.content || ""}
          isError={result?.is_error}
        />
      </div>
    </ToolCollapsibleWrapper>
  );
}
