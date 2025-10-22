/**
 * Main chat interface component
 * Displays conversation history with auto-scroll and WebSocket streaming support
 */

import { useEffect, useRef } from "react";
import { MessageCircle, AlertCircle, Loader2 } from "lucide-react";
import { MessageRenderer } from "./MessageRenderer";
import { ChatSkeleton } from "./ChatSkeleton";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import type { ChatMessage } from "@/shared/types/chat";

interface ChatInterfaceProps {
  projectId: string;
  sessionId?: string;
  messages?: ChatMessage[];
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
  isLoading?: boolean;
  error?: Error | null;
  isStreaming?: boolean;
  isLoadingHistory?: boolean;
}

/**
 * Chat interface component for displaying Claude conversations
 * Supports both static JSONL message display and real-time WebSocket streaming
 */
export function ChatInterface({
  projectId,
  sessionId,
  messages = [],
  toolResults = new Map(),
  isLoading = false,
  error = null,
  isStreaming = false,
  isLoadingHistory = false,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef(0);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!containerRef.current || !messagesEndRef.current) return;

    const container = containerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      200;

    // Only auto-scroll if user is already near the bottom
    // This preserves manual scroll position
    if (isNearBottom || previousScrollHeight.current === 0) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }

    previousScrollHeight.current = container.scrollHeight;
  }, [messages]);

  // Loading state
  if (isLoading) {
    return <ChatSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Failed to load conversation</div>
            <div className="text-sm mt-1">{error.message}</div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state - show loading if history is being fetched
  if (messages.length === 0) {
    if (isLoadingHistory) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
          <Loader2 className="h-12 w-12 mb-4 opacity-50 animate-spin" />
          <p className="text-lg font-medium">Loading conversation history...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No messages yet</p>
        <p className="text-sm mt-1">Start a conversation with Claude</p>
      </div>
    );
  }

  // Messages list
  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      data-project-id={projectId}
      data-session-id={sessionId}
    >
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {messages.map((message, index) => (
          <MessageRenderer
            key={message.id || `message-${index}`}
            message={message}
            toolResults={toolResults}
          />
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Claude is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
