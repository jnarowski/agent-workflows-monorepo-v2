/**
 * Assistant message component
 * Left-aligned with AI avatar
 */

import { Bot, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import type { ChatMessage } from '../../shared/types/chat';
import { ContentBlockRenderer } from './ContentBlockRenderer';

interface AssistantMessageProps {
  message: ChatMessage;
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
}

export function AssistantMessage({ message, toolResults }: AssistantMessageProps) {
  // Format timestamp
  const formattedTime = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex gap-3 mb-4">
      {/* Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 space-y-3 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Assistant</span>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
          {message.isStreaming && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Streaming...
            </div>
          )}
        </div>

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
    </div>
  );
}
