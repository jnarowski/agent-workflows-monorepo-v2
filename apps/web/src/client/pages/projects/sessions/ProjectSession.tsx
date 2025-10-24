import { useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "./components/ChatInterface";
import { ChatPromptInput, type ChatPromptInputHandle } from "./components/ChatPromptInput";
import { useSessionWebSocket } from "./hooks/useSessionWebSocket";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useActiveProject } from "@/client/hooks/navigation";
import { useNavigationStore } from "@/client/stores/index";
import { api } from "@/client/lib/api-client";
import type { ToolResultBlock } from "@/shared/types/message.types";
import { sessionKeys } from "./hooks/useAgentSessions";

export default function ProjectSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ sessionId?: string }>();
  const { projectId } = useActiveProject();
  const setActiveSession = useNavigationStore((s) => s.setActiveSession);
  const initialMessageSentRef = useRef(false);
  const queryClient = useQueryClient();
  const chatInputRef = useRef<ChatPromptInputHandle>(null);

  // Get sessionId from URL params (will be undefined for /session/new route)
  const sessionId = params.sessionId || null;

  // Get session from store
  const session = useSessionStore((s) => s.currentSession);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const loadSession = useSessionStore((s) => s.loadSession);
  const clearCurrentSession = useSessionStore((s) => s.clearCurrentSession);
  const addMessage = useSessionStore((s) => s.addMessage);
  const setStreaming = useSessionStore((s) => s.setStreaming);
  const defaultPermissionMode = useSessionStore((s) => s.defaultPermissionMode);

  // App-wide WebSocket hook for sending messages during session creation
  const { sendMessage: globalSendMessage, isConnected: globalIsConnected, reconnect } = useWebSocket();

  // WebSocket hook (subscribes to session events)
  const { isConnected, sendMessage: wsSendMessage } = useSessionWebSocket({
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
      // Always clear session when navigating to /new
      clearCurrentSession();
      return;
    }

    // Check if we have a query parameter (indicates message already sent, skip loadSession)
    const searchParams = new URLSearchParams(location.search);
    const queryParam = searchParams.get('query');

    if (queryParam) {
      if (import.meta.env.DEV) {
        console.log("[ProjectSession] Query param detected - skipping loadSession");
      }
      // Initialize session in store without fetching from server (only if not already initialized)
      if (currentSessionId !== sessionId) {
        clearCurrentSession();
        // Manually initialize the session store for this new session
        useSessionStore.setState({
          currentSessionId: sessionId,
          currentSession: {
            id: sessionId,
            agent: 'claude', // Default to claude for new sessions
            messages: [],
            isStreaming: false,
            metadata: null,
            loadingState: "loaded",
            error: null,
            permissionMode: defaultPermissionMode,
          },
        });
      }
      return;
    }

    // If this is a different session, handle the transition
    if (currentSessionId !== sessionId) {
      if (import.meta.env.DEV) {
        console.log("[ProjectSession] Session changed:", { from: currentSessionId, to: sessionId });
      }

      // Clear previous session only if we're coming from a different session
      if (currentSessionId && currentSessionId !== sessionId) {
        clearCurrentSession();
      }

      // Load session from server
      if (!session || session.id !== sessionId) {
        if (import.meta.env.DEV) {
          console.log("[ProjectSession] Loading session from server:", sessionId);
        }
        loadSession(sessionId, projectId).catch((err) => {
          console.error("[ProjectSession] Error loading session:", err);
        });
      } else {
        if (import.meta.env.DEV) {
          console.log("[ProjectSession] Session already in store, skipping load");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId, currentSessionId, location.search]);

  // Reset initialMessageSentRef when navigating to a different session
  useEffect(() => {
    initialMessageSentRef.current = false;
  }, [sessionId]);

  // Focus chat input when navigating to /session/new
  useEffect(() => {
    if (!sessionId) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [sessionId]);

  // Handle initial message from query parameter
  useEffect(() => {
    if (!sessionId || initialMessageSentRef.current) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const queryParam = searchParams.get('query');

    if (queryParam) {
      if (import.meta.env.DEV) {
        console.log("[ProjectSession] Processing initial message from query parameter");
      }
      initialMessageSentRef.current = true;

      try {
        // Decode the query parameter
        const decodedMessage = decodeURIComponent(queryParam);

        // Add the user message to the store for UI display
        // (Message was already sent via WebSocket during session creation)
        addMessage({
          id: crypto.randomUUID(),
          role: "user",
          content: [{ type: "text", text: decodedMessage }],
          timestamp: Date.now(),
        });

        // Set streaming state to show loading indicator
        setStreaming(true);

        // Remove query parameter from URL
        navigate(location.pathname, { replace: true });
      } catch (error) {
        console.error("[ProjectSession] Error decoding query parameter:", error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, location.search]);

  const handleSubmit = async (message: string, images?: File[]) => {
    if (import.meta.env.DEV) {
      console.log("[ProjectSession] handleSubmit called:", {
        message: message.substring(0, 100),
        imagesCount: images?.length || 0,
        sessionId,
        isFirstMessage: session?.isFirstMessage,
      });
    }

    if (!projectId) {
      console.error("[ProjectSession] No projectId available");
      return;
    }

    // If no sessionId, we're on /session/new - create session first then redirect
    if (!sessionId) {
      if (import.meta.env.DEV) {
        console.log("[ProjectSession] No sessionId - creating new session");
      }

      try {
        // Create session via API
        const { data: newSession } = await api.post<{ data: { id: string } }>(
          `/api/projects/${projectId}/sessions`,
          { sessionId: crypto.randomUUID() }
        );

        if (import.meta.env.DEV) {
          console.log("[ProjectSession] Session created:", newSession.id);
        }

        // Invalidate sessions query to update sidebar immediately
        queryClient.invalidateQueries({ queryKey: sessionKeys.byProject(projectId) });

        // Convert images to base64 if present
        const imagePaths = images ? await handleImageUpload(images) : undefined;

        // Immediately send message via app-wide WebSocket (before navigation)
        // This starts the assistant processing right away
        globalSendMessage(`session.${newSession.id}.send_message`, {
          message,
          images: imagePaths,
          config: {}, // First message, no resume
        });

        if (import.meta.env.DEV) {
          console.log("[ProjectSession] Message sent via WebSocket, now navigating");
        }

        // Navigate to the new session with query parameter
        // Query param signals: message already sent, just display it
        navigate(`/projects/${projectId}/session/${newSession.id}?query=${encodeURIComponent(message)}`, {
          replace: true,
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

    // Set streaming state immediately to show loading indicator
    setStreaming(true);

    // Count assistant messages to determine if we should resume
    const assistantMessageCount = session?.messages.filter(m => m.role === 'assistant').length || 0;
    const shouldResume = assistantMessageCount > 0;

    const config = shouldResume
      ? { resume: true, sessionId } // Subsequent messages: include resume flag
      : {}; // First message (no assistant responses yet): no resume

    if (import.meta.env.DEV) {
      console.log("[ProjectSession] Sending message via WebSocket", {
        assistantMessageCount,
        shouldResume,
        config
      });
    }

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
    !globalIsConnected || // Disable if global WebSocket not connected
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
          agent={session?.agent || 'claude'}
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
          <ChatPromptInput
            ref={chatInputRef}
            onSubmit={handleSubmit}
            disabled={inputDisabled}
            isStreaming={session?.isStreaming || false}
            totalTokens={session?.metadata?.totalTokens}
            currentMessageTokens={session?.currentMessageTokens}
          />
        </div>
      </div>
    </div>
  );
}
