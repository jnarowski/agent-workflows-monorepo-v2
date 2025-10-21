/**
 * Main chat interface component
 * Displays conversation history with auto-scroll
 */

import { useEffect, useRef } from 'react';
import { MessageCircle, AlertCircle } from 'lucide-react';
import { useClaudeSession } from '../../hooks/useClaudeSession';
import { MessageRenderer } from './MessageRenderer';
import { ChatSkeleton } from './ChatSkeleton';
import { Alert, AlertDescription } from '../ui/alert';

interface ChatInterfaceProps {
  projectId: string;
  sessionFile?: string;
}

/**
 * Chat interface component for displaying Claude conversations
 *
 * @future WebSocket Integration
 * To enable real-time streaming:
 * 1. Replace useClaudeSession with useAgentWebSocket hook
 * 2. Connect to WebSocket endpoint: `/ws/session/${sessionId}`
 * 3. Listen for StreamEvent messages from agent-cli-sdk
 * 4. Update messages array as events arrive (message_start, content_block_*, message_stop)
 * 5. Enable bi-directional communication (send user messages via WebSocket)
 *
 * The message types and ContentBlock structure are already aligned with
 * agent-cli-sdk's event format, so no type mapping is needed.
 */
export function ChatInterface({ projectId, sessionFile }: ChatInterfaceProps) {
  const { messages, toolResults, isLoading, error } = useClaudeSession(sessionFile);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef(0);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!containerRef.current || !messagesEndRef.current) return;

    const container = containerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    // Only auto-scroll if user is already near the bottom
    // This preserves manual scroll position
    if (isNearBottom || previousScrollHeight.current === 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
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

  // Empty state
  if (messages.length === 0) {
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
      className="flex-1 overflow-y-auto p-4 pb-32 space-y-1"
      data-project-id={projectId}
    >
      {messages.map((message) => (
        <MessageRenderer
          key={message.id}
          message={message}
          toolResults={toolResults}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
