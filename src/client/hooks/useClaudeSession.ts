/**
 * Hook to load and parse Claude session JSONL data
 * Currently loads from mock files, ready to be replaced with WebSocket streaming
 */

import { useState, useEffect } from 'react';
import type { ChatMessage } from '../../shared/types/chat';
import { parseJSONLSession, extractToolResults } from '../utils/parseClaudeSession';

interface UseClaudeSessionReturn {
  messages: ChatMessage[];
  toolResults: Map<string, { content: string; is_error?: boolean }>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Load and parse a Claude session from JSONL file
 *
 * @param sessionFile - Filename in /mocks/ directory (default: demo session)
 * @returns Parsed messages, tool results, loading state, and error
 *
 * @example
 * ```tsx
 * const { messages, toolResults, isLoading, error } = useClaudeSession();
 * ```
 *
 * @future
 * Replace this hook with useAgentWebSocket that receives real-time events:
 * - Connect to WebSocket endpoint `/ws/session/{id}`
 * - Listen for StreamEvent messages
 * - Build messages array incrementally as events arrive
 * - Update UI in real-time as assistant responds
 */
export function useClaudeSession(
  sessionFile: string = '8f079ffe-995f-42ba-b089-84de56817b6f.jsonl'
): UseClaudeSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolResults, setToolResults] = useState<Map<string, { content: string; is_error?: boolean }>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch JSONL file from public/mocks directory
        const response = await fetch(`/mocks/${sessionFile}`);

        if (!response.ok) {
          throw new Error(`Failed to load session: ${response.statusText}`);
        }

        const jsonlContent = await response.text();

        if (cancelled) return;

        // Parse JSONL into messages
        const parsedMessages = parseJSONLSession(jsonlContent);
        const parsedToolResults = extractToolResults(jsonlContent);

        setMessages(parsedMessages);
        setToolResults(parsedToolResults);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error loading session'));
          setMessages([]);
          setToolResults(new Map());
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionFile]);

  return {
    messages,
    toolResults,
    isLoading,
    error
  };
}

/**
 * Future WebSocket-based hook signature for reference
 *
 * @example
 * ```tsx
 * interface UseAgentWebSocketOptions {
 *   sessionId: string;
 *   projectId?: string;
 *   autoConnect?: boolean;
 * }
 *
 * function useAgentWebSocket(options: UseAgentWebSocketOptions) {
 *   const [messages, setMessages] = useState<ChatMessage[]>([]);
 *   const [isConnected, setIsConnected] = useState(false);
 *   const [error, setError] = useState<Error | null>(null);
 *
 *   useEffect(() => {
 *     const ws = new WebSocket(`ws://localhost:3456/ws/session/${options.sessionId}`);
 *
 *     ws.onmessage = (event) => {
 *       const streamEvent = JSON.parse(event.data);
 *       // Update messages based on streamEvent.type
 *       // Handle: message_start, content_block_start, content_block_delta, etc.
 *     };
 *
 *     return () => ws.close();
 *   }, [options.sessionId]);
 *
 *   return { messages, isConnected, error, sendMessage: (text) => {...} };
 * }
 * ```
 */
