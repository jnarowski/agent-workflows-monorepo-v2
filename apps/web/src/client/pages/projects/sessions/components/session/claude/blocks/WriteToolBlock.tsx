/**
 * Write tool block component
 */

import { useState } from "react";
import { ToolDot } from "../components/ToolDot";
import { getToolColor } from "../utils/getToolColor";
import { SyntaxHighlighter } from "@/client/utils/syntaxHighlighter";
import { getLanguageFromPath } from "@/client/utils/getLanguageFromPath";
import type { WriteToolInput } from "@/shared/types/tool.types";

interface WriteToolBlockProps {
  input: WriteToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 20;

export function WriteToolBlock({ input, result }: WriteToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  };

  // Create description based on result
  const getDescription = (): string => {
    if (result?.is_error) {
      return "Write failed";
    }
    return "File created";
  };

  const dotColor = getToolColor("Write", result?.is_error);
  const language = getLanguageFromPath(input.file_path);

  // Calculate total lines for truncation
  const totalLines = input.content.split("\n").length;
  const shouldTruncate = totalLines > MAX_LINES_PREVIEW;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <ToolDot color={dotColor} />
        <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Write</span>
            <span className="text-xs text-muted-foreground font-mono">
              {getFileName(input.file_path)}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            ↳ {getDescription()}
          </span>
        </div>
      </div>

      {/* Content preview */}
      <div className="pl-5 relative">
        <div
          className={`overflow-hidden rounded-lg ${
            shouldTruncate && !isExpanded ? "max-h-40" : ""
          }`}
        >
          <div
            className="text-xs [&_pre]:!bg-[#0d1117] [&_pre]:!m-0 [&_pre]:!p-3 [&_code]:!block"
            style={{
              fontFamily: "ui-monospace, monospace",
              border: "1px solid #21262d",
              borderRadius: "6px",
              overflow: "auto",
              backgroundColor: "#0d1117",
            }}
          >
            <SyntaxHighlighter
              code={input.content}
              language={language}
              showLineNumbers={false}
            />
          </div>
        </div>

        {/* Fade gradient overlay */}
        {shouldTruncate && !isExpanded && (
          <div
            className="absolute bottom-0 left-5 right-0 h-20 pointer-events-none rounded-b-lg"
            style={{
              background:
                "linear-gradient(to top, #0d1117 0%, transparent 100%)",
            }}
          />
        )}

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
