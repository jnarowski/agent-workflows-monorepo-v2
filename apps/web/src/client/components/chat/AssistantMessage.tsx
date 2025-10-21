/**
 * Assistant message component
 * Left-aligned with AI avatar
 */

import type { ChatMessage } from '../../shared/types/chat';
import { ContentBlockRenderer } from './ContentBlockRenderer';

interface AssistantMessageProps {
  message: ChatMessage;
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
}

export function AssistantMessage({ message, toolResults }: AssistantMessageProps) {
  // Handle both string content and ContentBlock[] formats
  const content = message.content;

  // If content is a string, display it as a simple text block
  if (typeof content === 'string') {
    return (
      <div className="w-full">
        <div className="text-base text-foreground">
          <div className="whitespace-pre-wrap break-words">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render content blocks
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
