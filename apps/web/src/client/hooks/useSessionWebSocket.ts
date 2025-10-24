/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useSessionStore } from "@/client/stores/sessionStore";
import { getAuthToken } from "@/client/lib/auth";
import type { ContentBlock } from "@/shared/types/chat";

/**
 * WebSocket ReadyState enum (borrowed from react-use-websocket)
 */
export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

interface WebSocketMessage {
  type: "connected" | "stream_output" | "message_complete" | "error";
  sessionId?: string;
  timestamp?: string;
  data?: any;
  metadata?: any;
  message?: string;
  error?: {
    message: string;
    stack?: string;
    name?: string;
    details?: any;
  };
}

interface UseSessionWebSocketOptions {
  sessionId: string;
  projectId: string;
}

/**
 * Calculate exponential backoff delay for reconnection attempts
 */
function getReconnectDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 16000);
}

/**
 * Hook to manage WebSocket connection for sessions (connection-only, no state)
 * All message state is managed by sessionStore
 */
export function useSessionWebSocket({ sessionId, projectId }: UseSessionWebSocketOptions) {
  const [readyState, setReadyState] = useState<ReadyState>(ReadyState.CLOSED);
  const [isReady, setIsReady] = useState(false); // Only true after 'connected' message

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isMountedRef = useRef(true);
  const messageQueueRef = useRef<string[]>([]);

  // Refs to avoid recreating callbacks
  const sessionIdRef = useRef(sessionId);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    projectIdRef.current = projectId;
  }, [sessionId, projectId]);

  const connect = useCallback(() => {
    const currentSessionId = sessionIdRef.current;
    const currentProjectId = projectIdRef.current;

    if (!currentSessionId || !currentProjectId || !isMountedRef.current) return;

    const token = getAuthToken();
    if (!token) {
      console.error("[useSessionWebSocket] Authentication token not found");
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat/${currentSessionId}?token=${token}`;

    console.log("[useSessionWebSocket] Connecting to WebSocket:", { sessionId: currentSessionId, projectId: currentProjectId });
    const ws = new WebSocket(wsUrl);
    setReadyState(ReadyState.CONNECTING);
    setIsReady(false);

    ws.onopen = () => {
      console.log("[useSessionWebSocket] WebSocket connected for session:", currentSessionId);
      setReadyState(ReadyState.OPEN);
      reconnectAttemptsRef.current = 0;
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            console.log("[useSessionWebSocket] Received 'connected' message, ready to send");
            setIsReady(true);

            // Flush message queue
            if (messageQueueRef.current.length > 0) {
              console.log("[useSessionWebSocket] Flushing message queue:", messageQueueRef.current.length);
              messageQueueRef.current.forEach((msg) => {
                ws.send(msg);
              });
              messageQueueRef.current = [];
            }
            break;

          case "stream_output":
            // Extract content blocks from streaming events
            if (data.data?.events && Array.isArray(data.data.events)) {
              for (const event of data.data.events) {
                if (event.type === "assistant" && event.message?.content) {
                  const content = event.message.content;
                  if (Array.isArray(content)) {
                    // Update streaming message in store
                    useSessionStore.getState().updateStreamingMessage(content as ContentBlock[]);
                  }
                }
              }
            }
            break;

          case "message_complete":
            console.log("[useSessionWebSocket] Message complete");

            // Finalize the message in store
            useSessionStore.getState().finalizeMessage(data.sessionId || "");

            // Update metadata if provided
            if (data.metadata) {
              useSessionStore.getState().updateMetadata(data.metadata);
            }
            break;

          case "error":
            console.error("[useSessionWebSocket] Error from server:", data.message, data.error);

            // Add error message to store
            useSessionStore.getState().addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: [{
                type: "text",
                text: `Error: ${data.message || "An error occurred"}\n\n${data.error?.details ? `Details: ${JSON.stringify(data.error.details, null, 2)}` : ""}`
              }],
              timestamp: Date.now(),
              isError: true,
            });

            // Set error in store
            useSessionStore.getState().setError(data.message || "An error occurred");
            useSessionStore.getState().setStreaming(false);
            break;

          default:
            console.log("[useSessionWebSocket] Unknown message type:", data.type);
        }
      } catch (err) {
        console.error("[useSessionWebSocket] Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (event) => {
      console.error("[useSessionWebSocket] WebSocket error:", event);
    };

    ws.onclose = () => {
      console.log("[useSessionWebSocket] WebSocket closed for session:", currentSessionId);
      setReadyState(ReadyState.CLOSED);
      setIsReady(false);

      // Clear wsRef if it's the current connection
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      // Attempt to reconnect if we haven't exceeded max attempts
      if (
        isMountedRef.current &&
        reconnectAttemptsRef.current < maxReconnectAttempts
      ) {
        const delay = getReconnectDelay(reconnectAttemptsRef.current);
        reconnectAttemptsRef.current += 1;

        console.log(
          `[useSessionWebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, delay);
      }
    };
  }, []); // Empty deps - stable callback that uses refs

  /**
   * Send a message via WebSocket
   * Queues the message if not ready, sends immediately if ready
   */
  const sendMessage = useCallback((message: string, images?: string[], config?: Record<string, any>) => {
    const currentSessionId = sessionIdRef.current;

    const payload = JSON.stringify({
      type: "send_message",
      sessionId: currentSessionId,
      message,
      images,
      config,
    });

    if (!isReady || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("[useSessionWebSocket] Queueing message (not ready yet)");
      messageQueueRef.current.push(payload);
      return;
    }

    console.log("[useSessionWebSocket] Sending message immediately");
    wsRef.current.send(payload);
  }, [isReady]);

  /**
   * Manual reconnect (resets attempt counter)
   */
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect when sessionId is available
  useEffect(() => {
    if (sessionId && projectId && readyState === ReadyState.CLOSED) {
      console.log("[useSessionWebSocket] Session ID available, connecting...");
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return {
    readyState,
    isConnected: readyState === ReadyState.OPEN,
    isReady,
    sendMessage,
    reconnect,
  };
}
