/**
 * Main chat interface component
 * Displays conversation history with auto-scroll and WebSocket streaming support
 */

import { useEffect, useRef } from "react";
import { MessageCircle, AlertCircle, Loader2 } from "lucide-react";
import { ChatSkeleton } from "./ChatSkeleton";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import type { SessionMessage } from "@/shared/types/message.types";
import type { AgentType } from "@/shared/types/agent.types";
import { getAgent } from "../../../../lib/agents";
import { useLoadingPhrase } from "@/client/hooks/useLoadingPhrase";

interface ChatInterfaceProps {
  projectId: string;
  sessionId?: string;
  agent?: AgentType;
  messages?: SessionMessage[];
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
  agent = 'claude',
  messages = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toolResults: _toolResults = new Map(),
  isLoading = false,
  error = null,
  isStreaming = false,
  isLoadingHistory = false,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef(0);

  // Get agent renderer
  const agentImpl = getAgent(agent);
  const AgentMessageRenderer = agentImpl.MessageRenderer;

  // Get fun loading phrase that rotates while streaming
  const loadingPhrase = useLoadingPhrase(isStreaming);

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
      className="h-full overflow-y-auto relative"
      data-project-id={projectId}
      data-session-id={sessionId}
    >
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <AgentMessageRenderer messages={messages} />
        {isStreaming && (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400 font-medium animate-[pulse_1s_ease-in-out_infinite]">
              {loadingPhrase}...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
