import { useEffect, useRef, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ChatInterface } from "@/client/components/chat/ChatInterface";
import { ChatPromptInput } from "@/client/components/chat/ChatPromptInput";
import { useSessionWebSocket } from "@/client/hooks/useSessionWebSocket";
import { useSessionStore } from "@/client/stores/sessionStore";
import { useActiveProject } from "@/client/hooks/navigation";
import { useNavigationStore } from "@/client/stores";
import { fetchWithAuth } from "@/client/lib/auth";
import type { ToolResultBlock } from "@/shared/types/chat";

export default function ProjectSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ sessionId?: string }>();
  const { projectId } = useActiveProject();
  const setActiveSession = useNavigationStore((s) => s.setActiveSession);
  const initialMessageSentRef = useRef(false);

  // Get sessionId from URL params (will be undefined for /session/new route)
  const sessionId = params.sessionId || null;

  // Get session from store
  const session = useSessionStore((s) => s.currentSession);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const loadSession = useSessionStore((s) => s.loadSession);
  const clearCurrentSession = useSessionStore((s) => s.clearCurrentSession);
  const addMessage = useSessionStore((s) => s.addMessage);

  // WebSocket hook (only connects when session status is 'created')
  const { isConnected, isReady, sendMessage: wsSendMessage, reconnect } = useSessionWebSocket({
    sessionId: sessionId || "",
    projectId: projectId || "",
  });

  // Sync sessionId to navigationStore when it changes
  useEffect(() => {
    if (sessionId) {
      setActiveSession(sessionId);
    }
  }, [sessionId, setActiveSession]);

  // Load session when sessionId changes
  useEffect(() => {
    // Skip loading if no sessionId (we're on /session/new route)
    if (!sessionId || !projectId) {
      // Clear any existing session when navigating to /new
      if (currentSessionId) {
        clearCurrentSession();
      }
      return;
    }

    // If this is a different session, handle the transition
    if (currentSessionId !== sessionId) {
      console.log("[ProjectSession] Session changed:", { from: currentSessionId, to: sessionId });

      // Clear previous session only if we're coming from a different session
      if (currentSessionId && currentSessionId !== sessionId) {
        clearCurrentSession();
      }

      // Load session from server
      if (!session || session.id !== sessionId) {
        console.log("[ProjectSession] Loading session from server:", sessionId);
        loadSession(sessionId, projectId).catch((err) => {
          console.error("[ProjectSession] Error loading session:", err);
        });
      } else {
        console.log("[ProjectSession] Session already in store, skipping load");
      }
    }
  }, [sessionId, projectId, currentSessionId, session, clearCurrentSession, loadSession]);

  // Reset initialMessageSentRef when navigating to a different session
  useEffect(() => {
    initialMessageSentRef.current = false;
  }, [sessionId]);

  // Handle initial message from navigation state
  useEffect(() => {
    const state = location.state as {
      initialMessage?: string;
      initialImages?: File[];
    } | null;

    if (
      state?.initialMessage &&
      sessionId &&
      !initialMessageSentRef.current
    ) {
      console.log("[ProjectSession] Processing initial message from navigation state");
      initialMessageSentRef.current = true;

      // Send the initial message (handleSubmit will add it to the store)
      const sendInitialMessage = async () => {
        await handleSubmit(state.initialMessage!, state.initialImages);
      };

      sendInitialMessage();

      // Clear the state to prevent re-sending on component updates
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, location.pathname, navigate]);

  const handleSubmit = async (message: string, images?: File[]) => {
    console.log("[ProjectSession] handleSubmit called:", {
      message: message.substring(0, 100),
      imagesCount: images?.length || 0,
      sessionId,
      isFirstMessage: session?.isFirstMessage,
    });

    if (!projectId) {
      console.error("[ProjectSession] No projectId available");
      return;
    }

    // If no sessionId, we're on /session/new - create session first then redirect
    if (!sessionId) {
      console.log("[ProjectSession] No sessionId - creating new session");

      try {
        // Create session via API
        const { data: newSession } = await fetchWithAuth(`/api/projects/${projectId}/sessions`, {
          method: "POST",
          body: JSON.stringify({ sessionId: crypto.randomUUID() }),
        });

        console.log("[ProjectSession] Session created:", newSession.id);

        // Redirect immediately to the new session with the message in state
        navigate(`/projects/${projectId}/session/${newSession.id}`, {
          replace: true,
          state: { initialMessage: message, initialImages: images },
        });
      } catch (error) {
        console.error("[ProjectSession] Error creating session:", error);
      }
      return;
    }

    // Convert images to base64 before sending via WebSocket
    const imagePaths = images ? await handleImageUpload(images) : undefined;

    // Add user message to store immediately
    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: [{ type: "text", text: message }],
      images: imagePaths,
      timestamp: Date.now(),
    });

    // Count assistant messages to determine if we should resume
    const assistantMessageCount = session?.messages.filter(m => m.role === 'assistant').length || 0;
    const shouldResume = assistantMessageCount > 0;

    const config = shouldResume
      ? { resume: true, sessionId } // Subsequent messages: include resume flag
      : {}; // First message (no assistant responses yet): no resume

    console.log("[ProjectSession] Sending message via WebSocket", {
      assistantMessageCount,
      shouldResume,
      config
    });

    wsSendMessage(message, imagePaths, config);
  };

  const handleImageUpload = async (files: File[]): Promise<string[]> => {
    // Convert File objects to base64 data URLs for WebSocket transmission
    return Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );
  };

  // Derive toolResults from messages
  const toolResults = useMemo(() => {
    const results = new Map<string, { content: string; is_error?: boolean }>();

    if (!session?.messages) return results;

    for (const message of session.messages) {
      for (const block of message.content) {
        if (block.type === "tool_result") {
          const toolResultBlock = block as ToolResultBlock;
          results.set(toolResultBlock.tool_use_id, {
            content: toolResultBlock.content,
            is_error: toolResultBlock.is_error,
          });
        }
      }
    }

    return results;
  }, [session?.messages]);

  // Determine if input should be blocked
  // Count assistant messages
  const assistantMessageCount = session?.messages.filter(m => m.role === 'assistant').length || 0;
  const waitingForFirstResponse = sessionId && assistantMessageCount === 0 && (session?.messages.length || 0) > 0;

  const inputDisabled =
    (sessionId && !isReady) || // Disable if we have a sessionId but WebSocket not ready
    waitingForFirstResponse; // Block until first assistant response

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Connection status banner */}
      {sessionId && !isConnected && (
        <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 flex items-center justify-between">
          <span>Disconnected from session</span>
          <button
            onClick={reconnect}
            className="text-yellow-900 underline hover:no-underline"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Chat Messages Container - takes up remaining space */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          projectId={projectId!}
          sessionId={sessionId || undefined}
          messages={session?.messages || []}
          toolResults={toolResults}
          isLoading={session?.loadingState === "loading"}
          error={session?.error || null}
          isStreaming={session?.isStreaming || false}
        />
      </div>

      {/* Fixed Input Container at Bottom */}
      <div className="md:pb-4 pb-2">
        <div className="mx-auto max-w-4xl">
          {/* Token usage display */}
          {sessionId && session?.metadata && (
            <div className="px-4 pb-2 text-xs text-muted-foreground text-center">
              <span>
                {session.metadata.totalTokens.toLocaleString()} tokens used
              </span>
            </div>
          )}
          <ChatPromptInput
            onSubmit={handleSubmit}
            disabled={inputDisabled}
            isStreaming={session?.isStreaming || false}
          />
        </div>
      </div>
    </div>
  );
}
