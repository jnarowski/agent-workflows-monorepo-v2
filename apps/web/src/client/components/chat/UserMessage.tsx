/**
 * User message component
 * Right-aligned with blue bubble design
 */

import type { ChatMessage, TextBlock } from '../../shared/types/chat';

interface UserMessageProps {
  message: ChatMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  // Extract text content from content blocks
  const textContent = message.content
    .filter((block): block is TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n\n');

  // Format timestamp
  const formattedTime = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[80%] space-y-1">
        {/* Timestamp */}
        <div className="text-xs text-muted-foreground text-right pr-1">
          {formattedTime}
        </div>

        {/* Message bubble */}
        <div className="rounded-lg bg-primary text-primary-foreground px-4 py-3 shadow-sm">
          <div className="whitespace-pre-wrap break-words text-sm">
            {textContent}
          </div>
        </div>
      </div>
    </div>
  );
}
