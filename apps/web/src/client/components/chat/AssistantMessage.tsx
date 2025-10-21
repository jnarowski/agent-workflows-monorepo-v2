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
  return (
    <div className="mb-4">
      {/* Content blocks */}
      <div className="space-y-3">
        {message.content.map((block, index) => (
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
