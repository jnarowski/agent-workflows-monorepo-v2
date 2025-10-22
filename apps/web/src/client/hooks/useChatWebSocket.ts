/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useChatContext } from "@/client/contexts/ChatContext";
import type { AgentSessionMetadata } from "@/shared/types";
import type { ContentBlock } from "@/shared/types/chat";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: ContentBlock[];
  timestamp?: string | number;
  images?: string[];
  isStreaming?: boolean;
  isError?: boolean;
}

interface WebSocketMessage {
  type: "stream_event" | "stream_output" | "message_complete" | "error";
  sessionId?: string;
  event?: {
    type: string;
    data?: any;
  };
  metadata?: AgentSessionMetadata;
  response?: {
    output: string;
    sessionId: string;
    status: "success" | "error" | "timeout";
    [key: string]: any;
  };
  events?: Array<{
    type: string;
    [key: string]: any;
  }>;
  data?: any;
  message?: string;
  error?: {
    message: string;
    stack?: string;
    name?: string;
    details?: any;
  };
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
  const isReconnectingRef = useRef(false);
  const isMountedRef = useRef(true);
  const isFirstMessageRef = useRef(true);

  const {
    setWebSocketConnection,
    removeWebSocketConnection,
    updateSessionMetadata,
  } = useChatContext();

  const connect = useCallback(() => {
    if (!sessionId || !projectId || !isMountedRef.current) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication token not found");
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      // Remove listeners to prevent reconnect loop
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
    const wsUrl = `${protocol}//${window.location.host}/ws/chat/${sessionId}?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected for session:", sessionId);
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
          case "stream_event":
            console.log("[WebSocket Client] Stream event:", data.event);
            if (data.event) {
              handleStreamEvent(data.event);
            }
            break;

          case "stream_output":
            console.log("[WebSocket Client] Stream output:", data.data);

            // Process streaming events as they arrive
            if (data.data?.events && Array.isArray(data.data.events)) {
              for (const event of data.data.events) {
                console.log("[WebSocket Client] Processing event:", event.type, event);

                // Handle assistant messages with structured content blocks
                if (event.type === "assistant" && event.message?.content) {
                  const content = event.message.content;

                  // Content should be an array of ContentBlocks
                  if (Array.isArray(content)) {
                    setMessages((prev) => {
                      const lastMessage = prev[prev.length - 1];
                      if (
                        lastMessage &&
                        lastMessage.role === "assistant" &&
                        lastMessage.isStreaming
                      ) {
                        // Merge content blocks with existing streaming message
                        const existingContent = Array.isArray(lastMessage.content)
                          ? lastMessage.content
                          : [];

                        // Merge or append content blocks
                        const mergedContent = [...existingContent];

                        for (const newBlock of content) {
                          // Find existing block of same type at same position
                          const existingBlockIndex = mergedContent.findIndex(
                            (b: any) => b.type === newBlock.type && b.id === newBlock.id
                          );

                          if (existingBlockIndex >= 0) {
                            // Merge with existing block (for streaming text/thinking)
                            const existingBlock = mergedContent[existingBlockIndex] as any;
                            if (newBlock.type === 'text' && existingBlock.type === 'text') {
                              mergedContent[existingBlockIndex] = {
                                ...existingBlock,
                                text: newBlock.text,
                              };
                            } else if (newBlock.type === 'thinking' && existingBlock.type === 'thinking') {
                              mergedContent[existingBlockIndex] = {
                                ...existingBlock,
                                thinking: newBlock.thinking,
                              };
                            } else {
                              // Replace for other types
                              mergedContent[existingBlockIndex] = newBlock;
                            }
                          } else {
                            // Append new block
                            mergedContent.push(newBlock);
                          }
                        }

                        return [
                          ...prev.slice(0, -1),
                          {
                            ...lastMessage,
                            content: mergedContent,
                          },
                        ];
                      } else {
                        // Create new streaming message with structured content
                        return [
                          ...prev,
                          {
                            id: crypto.randomUUID(),
                            role: "assistant",
                            content: content,
                            isStreaming: true,
                            timestamp: Date.now(),
                          },
                        ];
                      }
                    });
                  }
                }
              }
            }
            break;

          case "message_complete":
            console.log("[WebSocket Client] Message complete:", data);
            console.log("[WebSocket Client] Events received:", data.events);

            // Check if the response has an error status
            if (data.response?.status === "error") {
              console.error("[WebSocket Client] Error in message_complete response:", {
                response: data.response,
                stderr: data.response.raw?.stderr,
                error: data.response.error,
              });

              // Extract error message from stderr or error object
              const errorMessage =
                data.response.raw?.stderr ||
                data.response.error?.message ||
                data.response.output ||
                "An error occurred while processing your request";

              // Add error message as an assistant message
              setMessages((prev) => {
                // Remove any streaming message
                const filteredPrev = prev.filter(msg => !msg.isStreaming);

                return [
                  ...filteredPrev,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: [{ type: "text", text: errorMessage }],
                    timestamp: Date.now(),
                    isError: true,
                  },
                ];
              });

              setError(errorMessage);
              setIsStreaming(false);
              break;
            }

            setIsStreaming(false);

            // Finalize the streaming message (mark as complete)
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (
                lastMessage &&
                lastMessage.role === "assistant" &&
                lastMessage.isStreaming
              ) {
                // Mark streaming message as complete
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    isStreaming: false,
                  },
                ];
              }
              // If no streaming message exists, create one from the response
              // This handles cases where streaming didn't work
              if (data.response?.output) {
                return [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: [{ type: "text", text: data.response.output }],
                    timestamp: Date.now(),
                  },
                ];
              }
              return prev;
            });

            if (data.metadata) {
              updateSessionMetadata(sessionId, data.metadata);
            }
            break;

          case "error":
            console.error("[WebSocket Client] Error received from server:", {
              message: data.message,
              error: data.error,
              fullData: data,
            });

            // Log detailed error information
            if (data.error) {
              console.error("[WebSocket Client] Error details:", {
                name: data.error.name,
                message: data.error.message,
                stack: data.error.stack,
                details: data.error.details,
              });
            }

            // Add error message as an assistant message so it can be rendered with AI
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: [{
                  type: "text",
                  text: `Error: ${data.message || "An error occurred"}\n\n${data.error?.details ? `Details: ${JSON.stringify(data.error.details, null, 2)}` : ""}`
                }],
                timestamp: Date.now(),
                isError: true,
              },
            ]);

            setError(data.message || "An error occurred");
            setIsStreaming(false);
            break;

          default:
            console.log("[WebSocket Client] Unknown message type:", data.type);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setError("Connection error occurred");
    };

    ws.onclose = () => {
      console.log("WebSocket closed for session:", sessionId);
      setIsConnected(false);

      // Only clear wsRef if it's the current connection
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      removeWebSocketConnection(sessionId);

      // Only attempt to reconnect if not already reconnecting and component is still mounted
      if (
        !isReconnectingRef.current &&
        isMountedRef.current &&
        reconnectAttemptsRef.current < maxReconnectAttempts
      ) {
        isReconnectingRef.current = true;
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          10000
        );
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(
            `Reconnecting... (attempt ${reconnectAttemptsRef.current})`
          );
          isReconnectingRef.current = false;
          if (isMountedRef.current) {
            connect();
          }
        }, delay);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionId,
    projectId,
    setWebSocketConnection,
    removeWebSocketConnection,
    // updateSessionMetadata is stable (empty deps), no need to include
  ]);

  const handleStreamEvent = useCallback(
    (event: { type: string; data?: any }) => {
      if (event.type === "output" && event.data?.text) {
        // Append streaming text to the last assistant message
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (
            lastMessage &&
            lastMessage.role === "assistant" &&
            lastMessage.isStreaming
          ) {
            // Append to the first text block
            const updatedContent = [...lastMessage.content];
            const textBlockIndex = updatedContent.findIndex((b: any) => b.type === 'text');

            if (textBlockIndex >= 0) {
              const textBlock = updatedContent[textBlockIndex] as any;
              updatedContent[textBlockIndex] = {
                ...textBlock,
                text: textBlock.text + event.data.text,
              };
            } else {
              updatedContent.push({ type: 'text', text: event.data.text });
            }

            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: updatedContent,
              },
            ];
          } else {
            // Create new assistant message
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: [{ type: "text", text: event.data.text }],
                isStreaming: true,
                timestamp: Date.now(),
              },
            ];
          }
        });
      }
    },
    []
  );

  const sendMessage = useCallback(
    ({ message, images, config }: SendMessageOptions) => {
      console.log("[useChatWebSocket] sendMessage called:", {
        sessionId,
        message: message.substring(0, 100),
        imagesCount: images?.length || 0,
        wsState: wsRef.current?.readyState,
        wsOpen: wsRef.current?.readyState === WebSocket.OPEN,
        isFirstMessage: isFirstMessageRef.current,
      });

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("[useChatWebSocket] WebSocket not connected:", {
          hasWs: !!wsRef.current,
          readyState: wsRef.current?.readyState,
          CONNECTING: WebSocket.CONNECTING,
          OPEN: WebSocket.OPEN,
          CLOSING: WebSocket.CLOSING,
          CLOSED: WebSocket.CLOSED,
        });
        setError("WebSocket is not connected");
        return;
      }

      // Add user message to local state immediately
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: [{ type: "text", text: message }],
        images,
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        console.log(
          "[useChatWebSocket] Adding user message to state, current count:",
          prev.length
        );
        return [...prev, userMessage];
      });

      setIsStreaming(true);
      setError(null);

      // Merge config with resume flag for subsequent messages
      const mergedConfig = {
        ...config,
        // Add resume: true for all messages after the first
        ...(isFirstMessageRef.current ? {} : { resume: true, sessionId }),
      };

      // Send message via WebSocket
      const payload = {
        type: "send_message",
        sessionId,
        message,
        images,
        config: mergedConfig,
      };
      console.log("[useChatWebSocket] Sending WebSocket message:", payload);
      wsRef.current.send(JSON.stringify(payload));

      // Mark that we've sent the first message
      if (isFirstMessageRef.current) {
        isFirstMessageRef.current = false;
      }
    },
    [sessionId]
  );

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      isReconnectingRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        // Remove listeners to prevent reconnect on unmount
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId]); // Only depend on sessionId and projectId, not connect

  // Update isFirstMessageRef when messages are set from outside (e.g., loaded from API)
  useEffect(() => {
    if (messages.length > 0) {
      // If we have messages, it means this session already has history
      // So the next message should use resume: true
      isFirstMessageRef.current = false;
    }
  }, [messages.length]);

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
