/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import type { UnifiedMessage, UnifiedContent } from "@repo/agent-cli-sdk";
import type {
  SessionMessageCompleteData,
  SessionErrorData,
} from "@/shared/types/websocket";
import { sessionKeys } from "./useAgentSessions";
import { generateUUID } from "@/client/lib/utils";

interface UseSessionWebSocketOptions {
  sessionId: string;
  projectId: string;
}

/**
 * Hook to manage WebSocket events for sessions
 * Uses the global WebSocketProvider connection and EventBus
 * All message state is managed by sessionStore
 */
export function useSessionWebSocket({
  sessionId,
  projectId,
}: UseSessionWebSocketOptions) {
  const {
    sendMessage: sendWsMessage,
    readyState,
    isConnected,
    eventBus,
  } = useWebSocket();

  const queryClient = useQueryClient();

  // Refs to avoid recreating callbacks
  const sessionIdRef = useRef(sessionId);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    projectIdRef.current = projectId;
  }, [sessionId, projectId]);

  /**
   * Handle stream_output events
   * SDK already provides clean UnifiedMessage format - no transforms needed
   */
  const handleStreamOutput = useCallback(
    (data: { message?: UnifiedMessage }) => {
      console.log("[useSessionWebSocket] stream_output received:", {
        hasMessage: Boolean(data.message),
        messageId: data.message?.id,
        messageRole: data.message?.role,
        contentType: Array.isArray(data.message?.content) ? 'array' : typeof data.message?.content,
        contentLength: Array.isArray(data.message?.content) ? data.message.content.length : 0,
        contentBlockTypes: Array.isArray(data.message?.content)
          ? data.message.content.map(b => b.type)
          : [],
        rawData: data,
      });

      // SDK already provides clean UnifiedMessage
      if (data.message) {
        const msg = data.message;

        // Validate content before updating
        if (!Array.isArray(msg.content)) {
          console.error("[useSessionWebSocket] Message content is not an array:", msg);
          return;
        }

        // Check for empty content blocks
        const emptyTextBlocks = msg.content.filter(
          block => block.type === 'text' && (!block.text || block.text.trim() === '')
        );
        if (emptyTextBlocks.length > 0) {
          console.warn("[useSessionWebSocket] Message contains", emptyTextBlocks.length, "empty text blocks:", emptyTextBlocks);
        }

        if (msg.content.length === 0) {
          console.warn("[useSessionWebSocket] Message has EMPTY content array:", msg);
        }

        useSessionStore
          .getState()
          .updateStreamingMessage(msg.id, msg.content as UnifiedContent[]);
      } else {
        console.warn("[useSessionWebSocket] stream_output received without message:", data);
      }
    },
    []
  );

  /**
   * Handle message_complete events
   */
  const handleMessageComplete = useCallback(
    (data: SessionMessageCompleteData) => {
      console.log("[useSessionWebSocket] message_complete received:", data);

      // Get current session and messages
      const store = useSessionStore.getState();
      const session = store.session;

      if (!session?.messages.length) {
        return;
      }

      // If usage data is provided, attach it to the last assistant message
      if (data.usage) {
        const messages = [...session.messages];
        const lastMessageIndex = messages.length - 1;
        const lastMessage = messages[lastMessageIndex];

        if (lastMessage.role === "assistant") {
          // Create updated message with usage data
          messages[lastMessageIndex] = {
            ...lastMessage,
            usage: data.usage,
            isStreaming: false,
          };

          // Update store with new messages array
          useSessionStore.setState({
            session: {
              ...session,
              messages,
              isStreaming: false,
            },
          });
        }
      } else {
        // No usage data, just finalize the message
        store.finalizeMessage(sessionIdRef.current);
      }

      // Update metadata if provided (for other fields like model, stop_reason)
      if (data.metadata) {
        store.updateMetadata(data.metadata);
      }

      // Invalidate sessions query to update sidebar with new metadata
      queryClient.invalidateQueries({
        queryKey: sessionKeys.byProject(projectIdRef.current),
      });
    },
    [queryClient]
  );

  /**
   * Handle error events
   */
  const handleError = useCallback((data: SessionErrorData) => {
    console.error(
      "[useSessionWebSocket] Error from server:",
      data.message,
      data.error
    );

    // Add error message to store
    useSessionStore.getState().addMessage({
      id: generateUUID(),
      role: "assistant",
      content: [
        {
          type: "text",
          text: `Error: ${data.message || data.error || "An error occurred"}\n\n${(data as any).details ? `Details: ${JSON.stringify((data as any).details, null, 2)}` : ""}`,
        },
      ],
      timestamp: Date.now(),
      isError: true,
    });

    // Set error in store
    useSessionStore
      .getState()
      .setError(data.message || data.error || "An error occurred");
    useSessionStore.getState().setStreaming(false);
  }, []);

  /**
   * Subscribe to session events via EventBus
   */
  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to session-specific events
    const streamEvent = `session.${sessionId}.stream_output`;
    const completeEvent = `session.${sessionId}.message_complete`;
    const errorEvent = `session.${sessionId}.error`;

    eventBus.on(streamEvent, handleStreamOutput);
    eventBus.on(completeEvent, handleMessageComplete);
    eventBus.on(errorEvent, handleError);

    // Cleanup subscriptions on unmount or sessionId change
    return () => {
      eventBus.off(streamEvent, handleStreamOutput);
      eventBus.off(completeEvent, handleMessageComplete);
      eventBus.off(errorEvent, handleError);
    };
  }, [
    sessionId,
    eventBus,
    handleStreamOutput,
    handleMessageComplete,
    handleError,
  ]);

  /**
   * Send a message via WebSocket
   */
  const sendMessage = useCallback(
    (message: string, images?: string[], config?: Record<string, any>) => {
      const currentSessionId = sessionIdRef.current;

      if (!currentSessionId) {
        console.error(
          "[useSessionWebSocket] Cannot send message: no sessionId"
        );
        return;
      }

      // Send with flat event naming: session.{id}.send_message
      sendWsMessage(`session.${currentSessionId}.send_message`, {
        message,
        images,
        config,
      });
    },
    [sendWsMessage]
  );

  return {
    readyState,
    isConnected,
    sendMessage,
  };
}
