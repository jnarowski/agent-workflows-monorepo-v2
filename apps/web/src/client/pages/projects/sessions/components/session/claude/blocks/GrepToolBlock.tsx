/**
 * Grep tool block component
 */

import { useState } from "react";
import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";
import { ExpandButton } from "./ExpandButton";
import type { GrepToolInput } from "@/shared/types/tool.types";

interface GrepToolBlockProps {
  input: GrepToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 10;

export function GrepToolBlock({ input, result }: GrepToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useCodeBlockTheme();

  // Count lines in result
  const getDescription = (): string => {
    if (result?.is_error) {
      return "Search failed";
    }
    if (!result) {
      return "Searching...";
    }

    const lines = result.content.trim().split("\n");
    const count = lines.filter((line) => line.trim().length > 0).length;

    if (count === 0) {
      return "No matches found";
    }
    if (count === 1) {
      return "1 match";
    }
    return `${count} matches`;
  };

  // Calculate total lines for truncation
  const totalLines = result?.content
    ? result.content.trim().split("\n").filter((line) => line.trim().length > 0).length
    : 0;
  const shouldTruncate = totalLines > MAX_LINES_PREVIEW;

  return (
    <ToolCollapsibleWrapper
      toolName="Grep"
      contextInfo={`"${input.pattern}"`}
      description={getDescription()}
      hasError={result?.is_error}
      defaultOpen={false}
    >
      {/* Results */}
      {result && !result.is_error && result.content.trim() && (
        <div
          className={`relative rounded-lg border overflow-hidden ${
            shouldTruncate && !isExpanded ? "max-h-40" : ""
          }`}
          style={{
            borderColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <pre
            className="text-xs p-3 font-mono whitespace-pre-wrap break-words"
            style={{ margin: 0 }}
          >
            {result.content.trim()}
          </pre>

          {/* Fade gradient overlay */}
          {shouldTruncate && !isExpanded && (
            <>
              <div
                className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)`,
                }}
              />
              <ExpandButton onClick={() => setIsExpanded(true)} />
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {result?.is_error && (
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <pre className="text-xs font-mono text-red-500 whitespace-pre-wrap break-words">
            {result.content}
          </pre>
        </div>
      )}
    </ToolCollapsibleWrapper>
  );
}
