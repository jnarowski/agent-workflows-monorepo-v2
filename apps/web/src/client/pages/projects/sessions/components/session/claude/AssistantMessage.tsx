/**
 * Assistant message component
 * Left-aligned with AI avatar
 */

import { AlertCircle } from "lucide-react";
import type { UIMessage } from "@/shared/types/message.types";
import { ContentBlockRenderer } from "./ContentBlockRenderer";

interface AssistantMessageProps {
  message: UIMessage;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const content = message.content;

  // Strip ANSI color codes from text
  const stripAnsiCodes = (text: string): string => {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, "");
  };

  // Handle string content (legacy or error messages)
  if (typeof content === "string") {
    // Check if this is an error message
    if (message.isError) {
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
                      {stripAnsiCodes(content)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Render plain text content
    return (
      <div className="w-full overflow-hidden">
        <div className="whitespace-pre-wrap break-words">{content}</div>
      </div>
    );
  }

  // Check if this is an error message - render with special styling
  if (message.isError) {
    // Extract text from content blocks
    const errorText = content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? stripAnsiCodes(block.text) : ""))
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

  // Filter out empty text blocks
  const renderableContent = content.filter((block) => {
    if (block.type === 'text') {
      // Filter out empty or whitespace-only text blocks
      const isEmpty = !block.text || block.text.trim() === '';
      if (isEmpty) {
        console.warn('[AssistantMessage] Skipping empty text block in message:', message.id);
      }
      return !isEmpty;
    }
    // Keep all non-text blocks (tool_use, thinking, etc.)
    return true;
  });

  // Don't render if no content after filtering
  if (renderableContent.length === 0) {
    console.warn('[AssistantMessage] Message has no renderable content (all empty):', message.id);
    return null;
  }

  // Render content blocks with proper formatting
  return (
    <div className="w-full overflow-hidden">
      {/* Content blocks */}
      {renderableContent.map((block, index) => (
        <ContentBlockRenderer key={index} block={block} />
      ))}
    </div>
  );
}
