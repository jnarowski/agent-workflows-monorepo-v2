import React, { useEffect, useRef, useState } from 'react';
import { WebSocketEventBus } from '@/client/lib/WebSocketEventBus';
import { ReadyState, type WebSocketMessage } from '@/shared/types/websocket';
import { useAuthStore } from '@/client/stores/authStore';
import { WebSocketContext, type WebSocketContextValue } from '@/client/contexts/WebSocketContext';

/**
 * WebSocketProvider Props
 */
export interface WebSocketProviderProps {
  children: React.ReactNode;
}

/**
 * WebSocketProvider
 *
 * Manages a single global WebSocket connection for the entire application.
 * Uses EventBus for pub/sub pattern to distribute events to subscribers.
 * Automatically connects on mount, handles reconnection with exponential backoff.
 */
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const token = useAuthStore((state) => state.token);

  // WebSocket instance (stored in ref to avoid re-creating on state changes)
  const socketRef = useRef<WebSocket | null>(null);

  // EventBus instance (created once and shared)
  const eventBusRef = useRef(new WebSocketEventBus());

  // Message queue for messages sent before connection is ready
  const messageQueueRef = useRef<Array<{ type: string; data: unknown }>>([]);

  // Connection state
  const [readyState, setReadyState] = useState<ReadyState>(ReadyState.CLOSED);
  const [isReady, setIsReady] = useState(false);

  // Reconnection state
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);

  const isConnected = readyState === ReadyState.OPEN;

  /**
   * Calculate exponential backoff delay
   */
  const getReconnectDelay = (attempt: number): number => {
    const delays = [1000, 2000, 4000, 8000, 16000];
    return delays[Math.min(attempt, delays.length - 1)];
  };

  /**
   * Connect to WebSocket server
   */
  const connect = () => {
    // Don't connect if no token (user not logged in)
    if (!token) {
      console.log('[WebSocket] No auth token, skipping connection');
      return;
    }

    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In development, Vite runs on :5173 but backend is on :3456
      const isDev = import.meta.env.DEV;
      const wsHost = isDev ? 'localhost:3456' : window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/ws?token=${token}`;

      console.log('[WebSocket] Environment:', { isDev, wsHost, protocol: wsProtocol });
      console.log('[WebSocket] Connecting to', wsUrl.replace(token, '***'));

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      setReadyState(ReadyState.CONNECTING);
      setIsReady(false);

      // Handle connection open
      socket.onopen = () => {
        console.log('[WebSocket] Connection established');
        setReadyState(ReadyState.OPEN);
        // Note: We wait for 'global.connected' message before setting isReady
      };

      // Handle incoming messages
      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] Received:', message.type);

          // Handle global.connected event
          if (message.type === 'global.connected') {
            console.log('[WebSocket] Received global.connected, flushing message queue');
            setIsReady(true);
            reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection

            // Flush queued messages
            const queue = messageQueueRef.current;
            messageQueueRef.current = [];
            queue.forEach(({ type, data }) => {
              const msg = JSON.stringify({ type, data });
              socket.send(msg);
              console.log('[WebSocket] Sent queued message:', type);
            });
          }

          // Emit event to EventBus
          eventBusRef.current.emit(message.type, message.data);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      // Handle errors
      socket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        eventBusRef.current.emit('global.error', {
          error: 'WebSocket error occurred',
        });
      };

      // Handle connection close
      socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          intentionalClose: intentionalCloseRef.current,
          reconnectAttempts: reconnectAttemptsRef.current,
        });

        setReadyState(ReadyState.CLOSED);
        setIsReady(false);
        socketRef.current = null;

        // Handle specific close codes
        if (event.code === 1008) {
          // 1008 = Policy Violation (typically auth failure)
          console.error('[WebSocket] Authentication failed');
          eventBusRef.current.emit('global.error', {
            error: 'Authentication failed',
            message: 'Invalid or expired token',
          });
          return; // Don't attempt to reconnect
        }

        // Attempt reconnection if not intentional close
        if (!intentionalCloseRef.current && reconnectAttemptsRef.current < 5) {
          const delay = getReconnectDelay(reconnectAttemptsRef.current);
          console.log(
            `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/5)`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            console.log('[WebSocket] Executing reconnect attempt', reconnectAttemptsRef.current);
            connect();
          }, delay);
        } else if (!intentionalCloseRef.current && reconnectAttemptsRef.current >= 5) {
          console.error('[WebSocket] Max reconnection attempts reached');
          eventBusRef.current.emit('global.error', {
            error: 'Connection lost',
            message: 'Maximum reconnection attempts reached',
          });
        } else if (intentionalCloseRef.current) {
          console.log('[WebSocket] Intentional close, not reconnecting');
        }

        // Reset intentional close flag
        intentionalCloseRef.current = false;
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setReadyState(ReadyState.CLOSED);
    }
  };

  /**
   * Send a message through the WebSocket
   */
  const sendMessage = (type: string, data: unknown) => {
    if (!socketRef.current) {
      console.warn('[WebSocket] Cannot send message: no connection');
      return;
    }

    // Queue message if not ready yet
    if (!isReady) {
      console.log('[WebSocket] Queueing message (not ready yet):', type);
      messageQueueRef.current.push({ type, data });
      return;
    }

    // Send message immediately if ready
    if (socketRef.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, data });
      socketRef.current.send(message);
      console.log('[WebSocket] Sent:', type);
    } else {
      console.warn('[WebSocket] Cannot send message: connection not open');
    }
  };

  /**
   * Manually trigger reconnection (resets attempt counter)
   */
  const reconnect = () => {
    console.log('[WebSocket] Manual reconnect triggered');
    reconnectAttemptsRef.current = 0;

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    connect();
  };

  /**
   * Connect on mount, disconnect on unmount
   */
  useEffect(() => {
    // Capture the current eventBus reference for use in cleanup
    const eventBus = eventBusRef.current;

    connect();

    return () => {
      console.log('[WebSocket] Provider unmounting, closing connection');
      intentionalCloseRef.current = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
        const socket = socketRef.current;

        // If socket is still connecting, wait for it to open before closing
        // This prevents the browser error "WebSocket is closed before the connection is established"
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            socket.close();
          };
          socket.onerror = () => {}; // Suppress errors during cleanup
          socket.onclose = () => {}; // Suppress close events during cleanup
          socket.onmessage = null;
        } else if (socket.readyState === WebSocket.OPEN) {
          // Socket is already open, safe to close immediately
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = () => {}; // Suppress errors during cleanup
          socket.onclose = () => {}; // Suppress close events during cleanup
          socket.close();
        } else {
          // Socket is already closed or closing, just clean up handlers
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
        }

        socketRef.current = null;
      }

      // Clear all event listeners
      eventBus.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Reconnect when token changes

  const contextValue: WebSocketContextValue = {
    sendMessage,
    readyState,
    isConnected,
    eventBus: eventBusRef.current,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
