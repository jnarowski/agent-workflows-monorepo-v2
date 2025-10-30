/**
 * User message component
 * Bordered box design for better scannability
 */

import type {
  UIMessage,
  UnifiedToolResultBlock,
} from "@/shared/types/message.types";
import { ContentBlockRenderer } from "./ContentBlockRenderer";

interface UserMessageProps {
  message: UIMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  // Extract tool result blocks
  const toolResultBlocks = message.content.filter(
    (block): block is UnifiedToolResultBlock => block.type === "tool_result"
  );

  // Get all non-tool-result blocks for rendering
  const renderableBlocks = message.content.filter(
    (block) => block.type !== "tool_result"
  );

  // If message has no renderable content, don't render
  // This includes:
  // 1. Messages with only tool_result blocks (already shown inline with tool_use)
  // 2. Messages with empty content arrays (e.g., image-only tool results)
  if (renderableBlocks.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="max-w-full">
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          {/* Render all content blocks (text, slash_command, etc.) */}
          {renderableBlocks.map((block, index) => (
            <ContentBlockRenderer key={index} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}
