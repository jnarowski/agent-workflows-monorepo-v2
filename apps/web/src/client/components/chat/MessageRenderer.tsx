/**
 * Router for message renderers
 * Dispatches to UserMessage or AssistantMessage based on role
 */

import type { SessionMessage } from "@/shared/types/chat";
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

interface MessageRendererProps {
  message: SessionMessage;
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
}

export function MessageRenderer({ message, toolResults }: MessageRendererProps) {
  switch (message.role) {
    case 'user':
      return <UserMessage message={message} />;

    case 'assistant':
      return <AssistantMessage message={message} toolResults={toolResults} />;

    case 'system':
      // Optionally render system messages with minimal styling
      return (
        <div className="mb-4 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">
            System message
          </div>
        </div>
      );

    default:
      console.warn('Unknown message role:', message.role);
      return null;
  }
}
