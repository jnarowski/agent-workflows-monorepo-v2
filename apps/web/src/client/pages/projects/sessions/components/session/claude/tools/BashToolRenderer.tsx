/**
 * Renderer for Bash tool - shows command and output in a card
 */

import { useState } from "react";
import type { BashToolInput } from "@/shared/types/tool.types";

interface BashToolRendererProps {
  input: BashToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 3;

export function BashToolRenderer({ input, result }: BashToolRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if output has more than 3 lines
  const outputLines = result ? result.content.split("\n") : [];
  const shouldTruncate = outputLines.length > MAX_LINES_PREVIEW;
  const displayContent = shouldTruncate && !isExpanded
    ? outputLines.slice(0, MAX_LINES_PREVIEW).join("\n")
    : result?.content;

  return (
    <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
      {/* IN section */}
      <div className="flex gap-3">
        <span className="text-muted-foreground font-semibold flex-shrink-0 w-8">
          IN
        </span>
        <code className="flex-1 break-all">{input.command}</code>
      </div>

      {/* Divider */}
      {result && <div className="border-t border-border my-2" />}

      {/* OUT section - only show if result exists */}
      {result && (
        <div className="flex gap-3 relative">
          <span className="text-muted-foreground font-semibold flex-shrink-0 w-8">
            OUT
          </span>
          <div className="flex-1 relative">
            <pre
              className={`whitespace-pre-wrap break-all ${
                result.is_error ? "text-destructive" : ""
              }`}
            >
              {displayContent}
            </pre>

            {/* Click to expand button */}
            {shouldTruncate && !isExpanded && (
              <button
                className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border hover:bg-muted/50 cursor-pointer mt-1"
                onClick={() => setIsExpanded(true)}
              >
                Click to expand ({outputLines.length} lines)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
