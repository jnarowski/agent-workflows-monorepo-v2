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

  // If message only contains tool results (no other content), don't render
  // Tool results are already shown inline with the assistant's tool_use blocks
  if (renderableBlocks.length === 0 && toolResultBlocks.length > 0) {
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
