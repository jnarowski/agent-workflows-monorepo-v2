/**
 * Grep tool block component
 */

import { useState } from "react";
import { ToolDot } from "../components/ToolDot";
import { getToolColor } from "../utils/getToolColor";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";
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

  const dotColor = getToolColor("Grep", result?.is_error);

  // Calculate total lines for truncation
  const totalLines = result?.content
    ? result.content.trim().split("\n").filter((line) => line.trim().length > 0).length
    : 0;
  const shouldTruncate = totalLines > MAX_LINES_PREVIEW;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <ToolDot color={dotColor} />
        <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Grep</span>
            <span className="text-xs text-muted-foreground font-mono">
              "{input.pattern}"
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            ↳ {getDescription()}
          </span>
        </div>
      </div>

      {/* Results */}
      {result && !result.is_error && result.content.trim() && (
        <div className="pl-5">
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
                {/* Click to expand button */}
                <div className="absolute bottom-2 right-2">
                  <button
                    className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => setIsExpanded(true)}
                  >
                    Click to expand
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {result?.is_error && (
        <div className="pl-5">
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
        </div>
      )}
    </div>
  );
}
