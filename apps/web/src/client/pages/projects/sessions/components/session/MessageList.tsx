/**
 * Simple list renderer for chat messages
 * No processing, just iterates and renders each message
 */

import type { UIMessage } from "@/shared/types/message.types";
import { MessageRenderer } from "./claude/MessageRenderer";

interface MessageListProps {
  messages: UIMessage[];
}

/**
 * Simple list renderer for chat messages
 * No processing, just iterates and renders each message
 */
export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <MessageRenderer key={message.id} message={message} />
      ))}
    </div>
  );
}
