/**
 * Assistant message component
 * Left-aligned with AI avatar
 */

import { AlertCircle } from "lucide-react";
import type { SessionMessage } from "@/shared/types/message.types";
import { ContentBlockRenderer } from "./ContentBlockRenderer";

interface AssistantMessageProps {
  message: SessionMessage;
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
}

export function AssistantMessage({
  message,
  toolResults,
}: AssistantMessageProps) {
  const content = message.content;

  // Strip ANSI color codes from text
  const stripAnsiCodes = (text: string): string => {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, "");
  };

  // Check if this is an error message - render with special styling
  if (message.isError) {
    // Extract text from content blocks
    const errorText = content
      .filter((block) => block.type === "text")
      .map((block) => block.type === "text" ? stripAnsiCodes(block.text) : "")
      .join("\n");

    return (
      <div className="flex justify-center w-full">
        <div className="w-full max-w-4xl">
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                  Error from Server
                </div>
                <div className="text-sm text-red-800 dark:text-red-200">
                  <div className="whitespace-pre-wrap break-words">
                    {errorText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render content blocks with proper formatting
  return (
    <div className="w-full">
      {/* Content blocks */}
      <div className="space-y-4">
        {content.map((block, index) => (
          <ContentBlockRenderer
            key={index}
            block={block}
            toolResults={toolResults}
          />
        ))}
      </div>
    </div>
  );
}
