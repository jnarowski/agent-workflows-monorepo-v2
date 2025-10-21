import { useEffect, useRef, useCallback, useState } from 'react';
import { useShell } from '../contexts/ShellContext';

interface UseShellWebSocketOptions {
  sessionId: string;
  projectId: string;
  enabled?: boolean;
  onOutput?: (data: string) => void;
  onExit?: (exitCode: number, signal?: number) => void;
}

interface ShellWebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export function useShellWebSocket({
  sessionId,
  projectId,
  enabled = true,
  onOutput,
  onExit,
}: UseShellWebSocketOptions) {
  const { updateSessionStatus, updateSession } = useShell();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(
    (cols: number, rows: number) => {
      if (!enabled || wsRef.current) return;

      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        updateSessionStatus(sessionId, 'error', 'No authentication token found');
        return;
      }

      updateSessionStatus(sessionId, 'connecting');

      // Create WebSocket connection with token in query params
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:3456/shell?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Shell] WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send init message to spawn shell
        ws.send(
          JSON.stringify({
            type: 'init',
            projectId,
            cols,
            rows,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ShellWebSocketMessage;

          switch (message.type) {
            case 'initialized':
              console.log('[Shell] Session initialized:', message.sessionId);
              updateSession(sessionId, {
                sessionId: message.sessionId as string,
              });
              updateSessionStatus(sessionId, 'connected');
              break;

            case 'output':
              if (onOutput && typeof message.data === 'string') {
                onOutput(message.data);
              }
              break;

            case 'exit':
              console.log('[Shell] Process exited:', message);
              if (onExit) {
                onExit(
                  message.exitCode as number,
                  message.signal as number | undefined
                );
              }
              break;

            case 'error':
              console.error('[Shell] Error:', message.message);
              updateSessionStatus(
                sessionId,
                'error',
                message.message as string
              );
              break;

            default:
              console.warn('[Shell] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[Shell] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Shell] WebSocket error:', error);
        updateSessionStatus(sessionId, 'error', 'WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('[Shell] WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setIsConnected(false);
        wsRef.current = null;
        updateSessionStatus(sessionId, 'disconnected');

        // Attempt reconnection if not too many attempts
        if (
          enabled &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(
            `[Shell] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect(cols, rows);
          }, delay);
        }
      };
    },
    [enabled, sessionId, projectId, updateSessionStatus, updateSession, onOutput, onExit]
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      updateSessionStatus(sessionId, 'disconnected');
    }
  }, [sessionId, updateSessionStatus]);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'input',
          data,
        })
      );
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'resize',
          cols,
          rows,
        })
      );
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    sendInput,
    sendResize,
  };
}
