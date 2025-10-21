/**
 * User message component
 * Right-aligned with blue bubble design
 */

import type { ChatMessage, TextBlock, ToolResultBlock } from '../../shared/types/chat';

interface UserMessageProps {
  message: ChatMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  // Extract text content from content blocks
  const textBlocks = message.content.filter(
    (block): block is TextBlock => block.type === 'text'
  );

  // Extract tool result blocks
  const toolResultBlocks = message.content.filter(
    (block): block is ToolResultBlock => block.type === 'tool_result'
  );

  // If message only contains tool results (no text), don't render
  // Tool results are already shown inline with the assistant's tool_use blocks
  const hasText = textBlocks.length > 0;
  const hasToolResults = toolResultBlocks.length > 0;

  // Hide messages that only contain tool results (API plumbing, already shown in assistant message)
  if (!hasText && hasToolResults) {
    return null;
  }

  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[80%]">
        {/* Text content */}
        {hasText && (
          <div className="rounded-lg bg-primary text-primary-foreground px-4 py-3 shadow-sm">
            <div className="whitespace-pre-wrap wrap-break-word text-sm">
              {textBlocks.map((block: TextBlock) => block.text).join('\n\n')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
