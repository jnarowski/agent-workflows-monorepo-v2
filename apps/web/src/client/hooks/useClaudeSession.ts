/**
 * Hook to load and parse Claude session JSONL data with WebSocket streaming support
 */

import { useState, useEffect } from 'react';
import type { ChatMessage } from '../../shared/types/chat';
import { parseJSONLSession, extractToolResults } from '../utils/parseClaudeSession';
import { useChatWebSocket } from './useChatWebSocket';

interface UseClaudeSessionOptions {
  sessionId: string;
  projectId: string;
  enableWebSocket?: boolean;
}

interface UseClaudeSessionReturn {
  messages: ChatMessage[];
  toolResults: Map<string, { content: string; is_error?: boolean }>;
  isLoading: boolean;
  error: Error | null;
  isConnected?: boolean;
  isStreaming?: boolean;
  sendMessage?: (options: { message: string; images?: string[]; config?: Record<string, any> }) => void;
  reconnect?: () => void;
}

/**
 * Load and parse a Claude session from JSONL file with optional WebSocket streaming
 *
 * @param options - Session options including sessionId, projectId, and enableWebSocket
 * @returns Parsed messages, tool results, loading state, error, and WebSocket controls
 *
 * @example
 * ```tsx
 * const { messages, isLoading, sendMessage } = useClaudeSession({
 *   sessionId: 'abc-123',
 *   projectId: 'project-1',
 *   enableWebSocket: true
 * });
 * ```
 */
export function useClaudeSession(
  options: UseClaudeSessionOptions
): UseClaudeSessionReturn {
  const { sessionId, projectId, enableWebSocket = false } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolResults, setToolResults] = useState<Map<string, { content: string; is_error?: boolean }>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use WebSocket for real-time streaming if enabled
  const webSocket = enableWebSocket
    ? useChatWebSocket(sessionId, projectId)
    : {
        messages: [],
        isConnected: false,
        isStreaming: false,
        error: null,
        sendMessage: () => {},
        reconnect: () => {},
        setMessages: () => {},
      };

  // Load initial messages from JSONL file
  useEffect(() => {
    let cancelled = false;

    const loadSessionMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/projects/${projectId}/sessions/${sessionId}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load session messages: ${response.statusText}`);
        }

        const data = await response.json();
        const messagesArray = data.data || [];

        if (cancelled) return;

        // API already returns parsed messages array
        const parsedMessages: ChatMessage[] = messagesArray.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: typeof msg.content === 'string'
            ? msg.content
            : Array.isArray(msg.content)
              ? msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
              : '',
          timestamp: msg.timestamp,
          images: msg.images,
        }));

        // Extract tool results from messages
        const toolResultsMap = new Map<string, { content: string; is_error?: boolean }>();
        messagesArray.forEach((msg: any) => {
          if (msg.role === 'assistant' && Array.isArray(msg.content)) {
            msg.content.forEach((block: any) => {
              if (block.type === 'tool_result' && block.tool_use_id) {
                toolResultsMap.set(block.tool_use_id, {
                  content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
                  is_error: block.is_error,
                });
              }
            });
          }
        });

        console.log('Loaded session messages:', parsedMessages.length);

        setMessages(parsedMessages);
        setToolResults(toolResultsMap);

        // If WebSocket is enabled, initialize it with existing messages
        if (enableWebSocket && webSocket.setMessages) {
          webSocket.setMessages(parsedMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.timestamp,
            images: msg.images,
          })));
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error loading session';
          setError(new Error(errorMessage));
          console.error('Error loading session:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (sessionId && projectId) {
      loadSessionMessages();
    }

    return () => {
      cancelled = true;
    };
  }, [sessionId, projectId, enableWebSocket]);

  // Merge JSONL messages with WebSocket messages when WebSocket is enabled
  const finalMessages = enableWebSocket ? webSocket.messages : messages;
  const finalError = error || (enableWebSocket && webSocket.error ? new Error(webSocket.error) : null);

  return {
    messages: finalMessages,
    toolResults,
    isLoading,
    error: finalError,
    isConnected: enableWebSocket ? webSocket.isConnected : undefined,
    isStreaming: enableWebSocket ? webSocket.isStreaming : undefined,
    sendMessage: enableWebSocket ? webSocket.sendMessage : undefined,
    reconnect: enableWebSocket ? webSocket.reconnect : undefined,
  };
}
