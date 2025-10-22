/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Hook to load and parse Claude session JSONL data with WebSocket streaming support
 */

import { useState, useEffect } from 'react';
import type { ChatMessage } from "@/shared/types/chat";
import type { AgentSessionMetadata } from "@/shared/types";
import { parseJSONLSession, extractToolResults } from "@/client/utils/parseClaudeSession";
import { normalizeMessage } from "@/client/utils/sessionAdapters";
import { useChatWebSocket } from './useChatWebSocket';
import { useAuthStore } from "@/client/stores";

interface UseClaudeSessionOptions {
  sessionId: string;
  projectId: string;
  enableWebSocket?: boolean;
  onMetadataUpdate?: (metadata: AgentSessionMetadata) => void;
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
  const { sessionId, projectId, enableWebSocket = false, onMetadataUpdate } = options;
  const handleInvalidToken = useAuthStore((s) => s.handleInvalidToken);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolResults, setToolResults] = useState<Map<string, { content: string; is_error?: boolean }>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Always call useChatWebSocket (Rules of Hooks - must be called unconditionally)
  // We'll conditionally use its return values based on enableWebSocket flag
  const webSocket = useChatWebSocket(sessionId, projectId, onMetadataUpdate);

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
          // Handle 401 Unauthorized - invalid or missing token
          if (response.status === 401) {
            handleInvalidToken();
            throw new Error('Session expired');
          }
          // Handle 404 - session doesn't exist yet (new session)
          if (response.status === 404) {
            console.log('Session not found - this is a new session');
            if (cancelled) return;
            setMessages([]);
            setToolResults(new Map());
            if (enableWebSocket && webSocket.setMessages) {
              webSocket.setMessages([]);
            }
            return;
          }
          throw new Error(`Failed to load session messages: ${response.statusText}`);
        }

        const data = await response.json();
        const messagesArray = data.data || [];

        if (cancelled) return;

        // API already returns parsed messages array - normalize them
        const parsedMessages: ChatMessage[] = messagesArray.map((msg: any) => normalizeMessage(msg));

        // Extract tool results from messages
        // Note: Claude CLI JSONL format stores tool_result blocks in user messages (the message after assistant's tool_use)
        const toolResultsMap = new Map<string, { content: string; is_error?: boolean }>();
        messagesArray.forEach((msg: any) => {
          // Handle both Claude CLI format (msg.type, msg.message.content) and normalized format (msg.role, msg.content)
          const messageType = msg.type || msg.role;
          const messageContent = msg.message?.content || msg.content;

          // Check both user and assistant messages for tool_result blocks
          if ((messageType === 'user' || messageType === 'assistant') && Array.isArray(messageContent)) {
            messageContent.forEach((block: any) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId, enableWebSocket]);

  // Extract tool results from WebSocket messages when they update
  useEffect(() => {
    if (enableWebSocket && webSocket.messages.length > 0) {
      // Extract tool results from WebSocket messages
      const wsToolResultsMap = new Map(toolResults); // Start with existing results from JSONL

      webSocket.messages.forEach((msg: any) => {
        // WebSocket messages are already normalized with role and content
        if (Array.isArray(msg.content)) {
          msg.content.forEach((block: any) => {
            if (block.type === 'tool_result' && block.tool_use_id) {
              wsToolResultsMap.set(block.tool_use_id, {
                content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
                is_error: block.is_error,
              });
            }
          });
        }
      });

      // Only update if we found new tool results
      if (wsToolResultsMap.size !== toolResults.size) {
        setToolResults(wsToolResultsMap);
      }
    }
  }, [enableWebSocket, webSocket.messages, toolResults]);

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
