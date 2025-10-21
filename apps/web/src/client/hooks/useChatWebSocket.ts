import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatContext } from '../contexts/ChatContext';
import type { AgentSessionMetadata } from '../../shared/types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  images?: string[];
  isStreaming?: boolean;
}

interface WebSocketMessage {
  type: 'stream_event' | 'message_complete' | 'error';
  sessionId?: string;
  event?: {
    type: string;
    data?: any;
  };
  metadata?: AgentSessionMetadata;
  message?: string;
}

interface SendMessageOptions {
  message: string;
  images?: string[];
  config?: Record<string, any>;
}

export function useChatWebSocket(sessionId: string, projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const { setWebSocketConnection, removeWebSocketConnection, updateSessionMetadata } = useChatContext();

  const connect = useCallback(() => {
    if (!sessionId || !projectId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat/${sessionId}?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for session:', sessionId);
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
      wsRef.current = ws;
      setWebSocketConnection(sessionId, ws);
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'stream_event':
            if (data.event) {
              handleStreamEvent(data.event);
            }
            break;

          case 'message_complete':
            setIsStreaming(false);
            if (data.metadata) {
              updateSessionMetadata(sessionId, data.metadata);
            }
            break;

          case 'error':
            setError(data.message || 'An error occurred');
            setIsStreaming(false);
            break;
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('Connection error occurred');
    };

    ws.onclose = () => {
      console.log('WebSocket closed for session:', sessionId);
      setIsConnected(false);
      wsRef.current = null;
      removeWebSocketConnection(sessionId);

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
          connect();
        }, delay);
      }
    };
  }, [sessionId, projectId, setWebSocketConnection, removeWebSocketConnection, updateSessionMetadata]);

  const handleStreamEvent = useCallback((event: { type: string; data?: any }) => {
    if (event.type === 'output' && event.data?.text) {
      // Append streaming text to the last assistant message
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + event.data.text,
            },
          ];
        } else {
          // Create new assistant message
          return [
            ...prev,
            {
              role: 'assistant',
              content: event.data.text,
              isStreaming: true,
              timestamp: new Date().toISOString(),
            },
          ];
        }
      });
    }
  }, []);

  const sendMessage = useCallback(({ message, images, config }: SendMessageOptions) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket is not connected');
      return;
    }

    // Add user message to local state immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      images,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsStreaming(true);
    setError(null);

    // Send message via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'send_message',
      sessionId,
      message,
      images,
      config,
    }));
  }, [sessionId]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount and cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    messages,
    isConnected,
    isStreaming,
    error,
    sendMessage,
    reconnect,
    setMessages,
  };
}
