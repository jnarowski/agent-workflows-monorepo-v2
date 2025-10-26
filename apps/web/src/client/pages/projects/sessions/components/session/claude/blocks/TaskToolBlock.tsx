/**
 * Task tool block component
 */

import { useState } from "react";
import { ToolDot } from "../components/ToolDot";
import { getToolColor } from "../utils/getToolColor";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";
import type { TaskToolInput } from "@/shared/types/tool.types";

interface TaskToolBlockProps {
  input: TaskToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 20;

export function TaskToolBlock({ input, result }: TaskToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useCodeBlockTheme();

  // Create description based on result or status
  const getDescription = (): string => {
    if (result?.is_error) {
      return "Task failed";
    }
    if (result) {
      return "Task completed";
    }
    return input.description || "Running task";
  };

  const dotColor = getToolColor("Task", result?.is_error);

  // Calculate total lines for truncation
  const totalLines = input.prompt ? input.prompt.split("\n").length : 0;
  const shouldTruncate = totalLines > MAX_LINES_PREVIEW;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <ToolDot color={dotColor} />
        <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Task</span>
            {input.subagent_type && (
              <span className="text-xs text-muted-foreground font-mono">
                {input.subagent_type}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            ↳ {getDescription()}
          </span>
        </div>
      </div>

      {/* Prompt preview */}
      {input.prompt && (
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
            <div
              className="text-xs p-3"
              style={{
                fontFamily: "ui-monospace, monospace",
                color: colors.text,
              }}
            >
              <pre className="whitespace-pre-wrap break-words m-0">
                {input.prompt}
              </pre>
            </div>

            {/* Fade gradient overlay */}
            {shouldTruncate && !isExpanded && (
              <>
                <div
                  className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                  style={{
                    background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)`,
                  }}
                />
                {/* Click to expand button */}
                <div className="absolute bottom-4 right-4">
                  <button
                    className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-md border border-border hover:bg-muted/50 cursor-pointer"
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
    </div>
  );
}
