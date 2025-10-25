/**
 * Glob tool block component
 */

import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { ToolResultRenderer } from "../tools/ToolResultRenderer";
import type { GlobToolInput } from "@/shared/types/tool.types";

interface GlobToolBlockProps {
  input: GlobToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function GlobToolBlock({ input, result }: GlobToolBlockProps) {
  // Count files in result
  const getDescription = (): string | null => {
    if (!result || result.is_error) return null;

    const lines = result.content.trim().split("\n");
    const count = lines.filter((line) => line.trim().length > 0).length;

    if (count === 1) {
      return "Found 1 file";
    }
    return `Found ${count} files`;
  };

  return (
    <ToolCollapsibleWrapper
      toolName="Glob"
      contextInfo={`pattern: "${input.pattern}"`}
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
