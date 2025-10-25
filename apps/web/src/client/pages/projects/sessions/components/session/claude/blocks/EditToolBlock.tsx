/**
 * Edit tool block component
 */

import { useState } from "react";
import { diffLines } from "diff";
import { getLanguageFromPath } from "@/client/utils/getLanguageFromPath";
import { ToolDot } from "../components/ToolDot";
import { getToolColor } from "../utils/getToolColor";
import type { EditToolInput } from "@/shared/types/tool.types";

interface EditToolBlockProps {
  input: EditToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 10;

export function EditToolBlock({ input, result }: EditToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  };

  // Create description based on result
  const getDescription = (): string => {
    if (result?.is_error) {
      return "Edit failed";
    }
    return "Edit succeeded";
  };

  const dotColor = getToolColor("Edit", result?.is_error);
  const changes = diffLines(input.old_string, input.new_string);

  // Calculate total lines
  let totalLines = 0;
  changes.forEach((change) => {
    const lines = change.value.split("\n");
    if (lines[lines.length - 1] === "") {
      lines.pop();
    }
    totalLines += lines.length;
  });

  const shouldTruncate = totalLines > MAX_LINES_PREVIEW;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <ToolDot color={dotColor} />
        <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Edit</span>
            <span className="text-xs text-muted-foreground font-mono">
              {getFileName(input.file_path)}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            ↳ {getDescription()}
          </span>
        </div>
      </div>

      {/* Inline diff */}
      <div className="pl-5 relative">
        <div
          className={`rounded-md border border-border overflow-hidden ${
            shouldTruncate && !isExpanded ? "max-h-60" : ""
          }`}
        >
          <div className="font-mono text-xs overflow-x-auto">
            {changes.map((change, index) => {
              const lines = change.value.split("\n");
              if (lines[lines.length - 1] === "") {
                lines.pop();
              }

              if (change.added) {
                return lines.map((line, i) => (
                  <div
                    key={`${index}-${i}`}
                    className="bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-0.5 border-l-2 border-green-500"
                  >
                    <span className="select-none mr-2">+</span>
                    {line}
                  </div>
                ));
              }

              if (change.removed) {
                return lines.map((line, i) => (
                  <div
                    key={`${index}-${i}`}
                    className="bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-0.5 border-l-2 border-red-500"
                  >
                    <span className="select-none mr-2">-</span>
                    {line}
                  </div>
                ));
              }

              // Unchanged lines
              return lines.map((line, i) => (
                <div
                  key={`${index}-${i}`}
                  className="text-muted-foreground px-3 py-0.5"
                >
                  <span className="select-none mr-2"> </span>
                  {line}
                </div>
              ));
            })}
          </div>
        </div>

        {/* Click to expand overlay */}
        {shouldTruncate && !isExpanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-2 cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-md border border-border hover:bg-muted/50">
              Click to expand
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
