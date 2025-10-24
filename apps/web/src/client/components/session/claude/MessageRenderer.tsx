/**
 * Router for message renderers
 * Dispatches to UserMessage or AssistantMessage based on role
 */

import type { SessionMessage } from "@/shared/types/message.types";
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

    default:
      console.warn('Unknown message role:', message.role);
      return null;
  }
}
