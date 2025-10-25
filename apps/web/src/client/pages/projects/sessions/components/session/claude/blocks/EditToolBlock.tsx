/**
 * Edit tool block component
 */

import { useState } from "react";
import { diffLines } from "diff";
import { ToolDot } from "../components/ToolDot";
import { getToolColor } from "../utils/getToolColor";
import { SideBySideDiffViewer } from "@/client/pages/projects/sessions/components/SideBySideDiffViewer";
import type { EditToolInput } from "@/shared/types/tool.types";

interface EditToolBlockProps {
  input: EditToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 6;

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
    <div className="space-y-2">
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
          className={`overflow-hidden rounded-lg ${
            shouldTruncate && !isExpanded ? "max-h-80" : ""
          }`}
        >
          <SideBySideDiffViewer
            oldString={input.old_string}
            newString={input.new_string}
            filePath={input.file_path}
          />
        </div>

        {/* Click to expand button */}
        {shouldTruncate && !isExpanded && (
          <div className="absolute bottom-4 right-4">
            <button
              className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-md border border-border hover:bg-muted/50 cursor-pointer"
              onClick={() => setIsExpanded(true)}
            >
              Click to expand
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
