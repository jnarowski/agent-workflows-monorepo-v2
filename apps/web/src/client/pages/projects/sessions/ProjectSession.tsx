import { useEffect, useRef, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "./components/ChatInterface";
import {
  ChatPromptInput,
  type ChatPromptInputHandle,
} from "./components/ChatPromptInput";
import { ConnectionStatusBanner } from "./components/ConnectionStatusBanner";
import { useSessionWebSocket } from "./hooks/useSessionWebSocket";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import {
  useSessionStore,
  selectTotalTokens,
} from "@/client/pages/projects/sessions/stores/sessionStore";
import { useActiveProject } from "@/client/hooks/navigation";
import { useNavigationStore } from "@/client/stores/index";
import { api } from "@/client/lib/api-client";
import type { ToolResultBlock } from "@/shared/types/message.types";
import { sessionKeys } from "./hooks/useAgentSessions";
import { projectKeys } from "@/client/pages/projects/hooks/useProjects";
import { generateUUID } from "@/client/lib/utils";
import { AgentSelector } from "@/client/components/AgentSelector";
import type { AgentType } from "@/shared/types/agent.types";

export default function ProjectSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ sessionId?: string }>();
  const { projectId } = useActiveProject();
  const setActiveSession = useNavigationStore((s) => s.setActiveSession);
  const initialMessageSentRef = useRef(false);
  const loadSessionInitiatedRef = useRef(false);
  const queryClient = useQueryClient();
  const chatInputRef = useRef<ChatPromptInputHandle>(null);

  // Get sessionId from URL params (will be undefined for /session/new route)
  const sessionId = params.sessionId || null;

  // Get agent from query params, default to claude
  const searchParams = new URLSearchParams(location.search);
  const agentFromUrl = (searchParams.get("agent") as AgentType) || "claude";

  // Local state for selected agent (only used when sessionId is null)
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(agentFromUrl);

  // Sync selectedAgent when URL query param changes
  useEffect(() => {
    if (!sessionId && agentFromUrl !== selectedAgent) {
      setSelectedAgent(agentFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentFromUrl, sessionId]);

  // Get session from store
  const session = useSessionStore((s) => s.session);
  const currentSessionId = useSessionStore((s) => s.sessionId);
  const loadSession = useSessionStore((s) => s.loadSession);
  const clearSession = useSessionStore((s) => s.clearSession);
  const addMessage = useSessionStore((s) => s.addMessage);
  const setStreaming = useSessionStore((s) => s.setStreaming);
  const totalTokens = useSessionStore(selectTotalTokens);

  // App-wide WebSocket hook for sending messages during session creation
  const {
    sendMessage: globalSendMessage,
    isConnected: globalIsConnected,
    readyState,
    isReady,
    connectionAttempts,
    reconnect,
  } = useWebSocket();

  // WebSocket hook (subscribes to session events)
  const { sendMessage: wsSendMessage } = useSessionWebSocket({
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
      clearSession();
      return;
    }

    // Check if we have a query parameter (indicates message already sent, skip loadSession)
    const searchParams = new URLSearchParams(location.search);
    const queryParam = searchParams.get("query");

    if (queryParam) {
      if (import.meta.env.DEV) {
        console.log(
          "[ProjectSession] Query param detected - skipping loadSession"
        );
      }
      // Initialize session in store without fetching from server (only if not already initialized)
      if (currentSessionId !== sessionId) {
        clearSession();
        // Use selectedAgent from local state
        // Manually initialize the session store for this new session
        useSessionStore.setState({
          sessionId: sessionId,
          session: {
            id: sessionId,
            agent: selectedAgent, // Use selected agent from local state
            messages: [],
            isStreaming: false,
            metadata: null,
            loadingState: "loaded",
            error: null,
          },
        });
      }
      return;
    }

    // If this is a different session, handle the transition
    if (currentSessionId !== sessionId) {
      if (import.meta.env.DEV) {
        console.log("[ProjectSession] Session changed:", {
          from: currentSessionId,
          to: sessionId,
        });
      }

      // Clear previous session only if we're coming from a different session
      if (currentSessionId && currentSessionId !== sessionId) {
        clearSession();
        loadSessionInitiatedRef.current = false; // Reset on session change
      }

      // Load session from server
      if (!session || session.id !== sessionId) {
        // Skip if already initiated (handles React Strict Mode double-invocation)
        if (loadSessionInitiatedRef.current) {
          if (import.meta.env.DEV) {
            console.log(
              "[ProjectSession] Load already initiated, skipping duplicate call"
            );
          }
          return;
        }

        if (import.meta.env.DEV) {
          console.log(
            "[ProjectSession] Loading session from server:",
            sessionId
          );
        }

        // Mark as initiated immediately to prevent duplicate calls
        loadSessionInitiatedRef.current = true;

        loadSession(sessionId, projectId, queryClient).catch((err) => {
          console.error("[ProjectSession] Error loading session:", err);
          // Reset ref on error so user can retry
          loadSessionInitiatedRef.current = false;
        });
      } else {
        if (import.meta.env.DEV) {
          console.log(
            "[ProjectSession] Session already in store, skipping load"
          );
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
    const queryParam = searchParams.get("query");

    if (queryParam) {
      if (import.meta.env.DEV) {
        console.log(
          "[ProjectSession] Processing initial message from query parameter"
        );
      }
      initialMessageSentRef.current = true;

      try {
        const decodedMessage = decodeURIComponent(queryParam);

        // Add the user message to the store for UI display
        // (Message was already sent via WebSocket during session creation)
        addMessage({
          id: generateUUID(),
          role: "user",
          content: [{ type: "text", text: decodedMessage }],
          timestamp: Date.now(),
        });

        // Set streaming state to show loading indicator
        setStreaming(true);

        // Remove query parameter from URL
        navigate(location.pathname, { replace: true });
      } catch (error) {
        console.error(
          "[ProjectSession] Error processing query parameter:",
          error
        );
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
        // Use selectedAgent from local state (can be changed on /new page)
        const agent = selectedAgent;

        // Create session via API
        const { data: newSession } = await api.post<{ data: { id: string } }>(
          `/api/projects/${projectId}/sessions`,
          { sessionId: generateUUID(), agent }
        );

        // Invalidate sessions query to update sidebar immediately
        queryClient.invalidateQueries({
          queryKey: sessionKeys.byProject(projectId),
        });

        // Also invalidate projectsWithSessions which is used by the sidebar
        queryClient.invalidateQueries({
          queryKey: projectKeys.withSessions(),
        });

        // Convert images to base64 if present
        const imagePaths = images ? await handleImageUpload(images) : undefined;

        // Get permission mode from form
        const getPermissionMode = useSessionStore.getState().getPermissionMode;
        const permissionMode = getPermissionMode();

        // Immediately send message via app-wide WebSocket (before navigation)
        // This starts the assistant processing right away
        // New session = resume: false (no prior messages)
        globalSendMessage(`session.${newSession.id}.send_message`, {
          message,
          images: imagePaths,
          config: {
            resume: false,
            sessionId: newSession.id,
            permissionMode,
          },
        });

        // Navigate to the new session with query parameter
        // Query param signals: message already sent, just display it
        navigate(
          `/projects/${projectId}/session/${newSession.id}?query=${encodeURIComponent(message)}`,
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error("[ProjectSession] Error creating session:", error);
      }
      return;
    }

    // Convert images to base64 before sending via WebSocket
    const imagePaths = images ? await handleImageUpload(images) : undefined;

    // Add user message to store immediately
    addMessage({
      id: generateUUID(),
      role: "user",
      content: [{ type: "text", text: message }],
      images: imagePaths,
      timestamp: Date.now(),
    });

    // Set streaming state immediately to show loading indicator
    setStreaming(true);

    // Count assistant messages to determine if we should resume
    const assistantMessageCount =
      session?.messages.filter((m) => m.role === "assistant").length || 0;
    const resume = assistantMessageCount > 0;

    // Get permission mode from form
    const getPermissionMode = useSessionStore.getState().getPermissionMode;
    const permissionMode = getPermissionMode();

    const config = {
      resume,
      sessionId,
      permissionMode,
    };

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
  const assistantMessageCount =
    session?.messages.filter((m) => m.role === "assistant").length || 0;
  const waitingForFirstResponse =
    sessionId &&
    assistantMessageCount === 0 &&
    (session?.messages.length || 0) > 0;

  const inputDisabled =
    !globalIsConnected || // Disable if global WebSocket not connected
    waitingForFirstResponse; // Block until first assistant response

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Connection status banner */}
      <ConnectionStatusBanner
        sessionId={sessionId}
        readyState={readyState}
        isReady={isReady}
        connectionAttempts={connectionAttempts}
        onReconnect={reconnect}
      />

      {/* Chat Messages Container - takes up remaining space */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          projectId={projectId!}
          sessionId={sessionId || undefined}
          agent={session?.agent || "claude"}
          messages={session?.messages || []}
          toolResults={toolResults}
          isLoading={session?.loadingState === "loading"}
          error={session?.error || null}
          isStreaming={session?.isStreaming || false}
        />
      </div>

      {/* Fixed Input Container at Bottom */}
      <div className="md:pb-4 md:px-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Agent selector - only show on /new page */}
          {!sessionId && (
            <div>
              <AgentSelector
                value={selectedAgent}
                onChange={setSelectedAgent}
              />
            </div>
          )}

          <ChatPromptInput
            ref={chatInputRef}
            onSubmit={handleSubmit}
            disabled={inputDisabled}
            isStreaming={session?.isStreaming || false}
            totalTokens={totalTokens}
          />
        </div>
      </div>
    </div>
  );
}
