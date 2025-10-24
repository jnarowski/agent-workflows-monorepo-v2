/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback, useRef } from "react";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { getAgent } from "../../../../lib/agents";
import type { ContentBlock } from "@/shared/types/message.types";
import type {
  SessionStreamOutputData,
  SessionMessageCompleteData,
  SessionErrorData,
} from "@/shared/types/websocket";

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

  // Refs to avoid recreating callbacks
  const sessionIdRef = useRef(sessionId);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    projectIdRef.current = projectId;
  }, [sessionId, projectId]);

  /**
   * Handle stream_output events
   */
  const handleStreamOutput = useCallback((data: SessionStreamOutputData) => {
    // Get current session to access agent type
    const currentSession = useSessionStore.getState().currentSession;
    if (!currentSession) {
      console.warn("[useSessionWebSocket] No current session, skipping stream update");
      return;
    }

    // Get agent implementation and use its transform
    const agent = getAgent(currentSession.agent);
    const streamingMessage = agent.transformStreaming(data);

    // Only update if we have a valid streaming message - skip system/result events
    if (streamingMessage) {
      useSessionStore
        .getState()
        .updateStreamingMessage(streamingMessage.id, streamingMessage.content as ContentBlock[]);
    }
  }, []);

  /**
   * Handle message_complete events
   */
  const handleMessageComplete = useCallback(
    (data: SessionMessageCompleteData) => {
      console.log("[useSessionWebSocket] Message complete");

      // Finalize the message in store
      useSessionStore.getState().finalizeMessage(sessionIdRef.current);

      // Update metadata if provided
      if (data.metadata) {
        useSessionStore.getState().updateMetadata(data.metadata);
      }
    },
    []
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
      id: crypto.randomUUID(),
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

    console.log(
      "[useSessionWebSocket] Subscribing to session events:",
      sessionId
    );

    // Subscribe to session-specific events
    const streamEvent = `session.${sessionId}.stream_output`;
    const completeEvent = `session.${sessionId}.message_complete`;
    const errorEvent = `session.${sessionId}.error`;

    eventBus.on(streamEvent, handleStreamOutput);
    eventBus.on(completeEvent, handleMessageComplete);
    eventBus.on(errorEvent, handleError);

    // Cleanup subscriptions on unmount or sessionId change
    return () => {
      console.log(
        "[useSessionWebSocket] Unsubscribing from session events:",
        sessionId
      );
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

      console.log(
        "[useSessionWebSocket] Sending message for session:",
        currentSessionId
      );

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
