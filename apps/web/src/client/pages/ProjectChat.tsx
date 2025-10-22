import { useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChatInterface } from "@/client/components/chat/ChatInterface";
import { ChatPromptInput } from "@/client/components/chat/ChatPromptInput";
import { useClaudeSession } from "@/client/hooks/useClaudeSession";
import { useChatContext } from "@/client/contexts/ChatContext";
import { useSessionMessages } from "@/client/hooks/useSessionMessages";
import { v4 as uuidv4 } from "uuid";

export default function ProjectChat() {
  const { id, sessionId } = useParams<{ id: string; sessionId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentSession, activeSessions, createSession } = useChatContext();
  const initialMessageSentRef = useRef(false);

  // Get session metadata for token count
  const sessionMetadata = sessionId
    ? activeSessions.get(sessionId)?.metadata
    : undefined;

  // Load session with WebSocket if sessionId is present
  const {
    messages,
    toolResults,
    isLoading,
    error,
    isConnected,
    isStreaming,
    sendMessage,
    reconnect,
  } = useClaudeSession({
    sessionId: sessionId || "",
    projectId: id || "",
    enableWebSocket: !!sessionId,
  });

  // Load historical messages from JSONL file
  const {
    data: historicalMessages = [],
    isLoading: isLoadingHistory,
  } = useSessionMessages(id || "", sessionId || "");

  // Merge and deduplicate messages from both sources
  const allMessages = useMemo(() => {
    const messageMap = new Map();

    // Add historical messages first
    historicalMessages.forEach((msg) => {
      const key = msg.id || msg.timestamp || JSON.stringify(msg);
      messageMap.set(key, msg);
    });

    // Add/overwrite with WebSocket messages (more recent)
    messages.forEach((msg) => {
      const key = msg.id || msg.timestamp || JSON.stringify(msg);
      messageMap.set(key, msg);
    });

    // Sort by timestamp
    return Array.from(messageMap.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });
  }, [historicalMessages, messages]);

  // Set current session in context
  useEffect(() => {
    if (sessionId) {
      setCurrentSession(sessionId);
    }
    return () => setCurrentSession(null);
  }, [sessionId, setCurrentSession]);

  // Handle initial message from navigation state
  useEffect(() => {
    const state = location.state as { initialMessage?: string; initialImages?: File[] } | null;

    if (
      state?.initialMessage &&
      sessionId &&
      isConnected &&
      sendMessage &&
      !initialMessageSentRef.current
    ) {
      console.log('[ProjectChat] Sending initial message from navigation state');
      initialMessageSentRef.current = true;

      // Send the initial message
      const sendInitialMessage = async () => {
        const imagePaths = state.initialImages ? await handleImageUpload(state.initialImages) : undefined;
        sendMessage({ message: state.initialMessage!, images: imagePaths });
      };

      sendInitialMessage();

      // Clear the state to prevent re-sending on component updates
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [sessionId, isConnected, sendMessage, location, navigate]);

  const handleSubmit = async (message: string, images?: File[]) => {
    console.log('[ProjectChat] handleSubmit called:', {
      message: message.substring(0, 100),
      imagesCount: images?.length || 0,
      hasSendMessage: !!sendMessage,
      sessionId,
      isConnected
    });

    // If no sessionId, create a new session
    if (!sessionId) {
      console.log('[ProjectChat] No sessionId, creating new session');
      const newSessionId = uuidv4();

      try {
        // Create the session in the backend
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/projects/${id}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId: newSessionId }),
        });

        if (!response.ok) {
          console.error('[ProjectChat] Failed to create session:', response.statusText);
          return;
        }

        // Create session in context
        createSession(newSessionId);

        // Navigate to the new session with the message as state
        navigate(`/projects/${id}/chat/${newSessionId}`, {
          state: { initialMessage: message, initialImages: images },
          replace: true
        });
      } catch (error) {
        console.error('[ProjectChat] Error creating session:', error);
      }
      return;
    }

    if (!sendMessage) {
      console.error('[ProjectChat] sendMessage is not available');
      return;
    }

    // Convert images to base64 before sending via WebSocket
    const imagePaths = images ? await handleImageUpload(images) : undefined;
    console.log('[ProjectChat] Calling sendMessage with processed data');
    sendMessage({ message, images: imagePaths });
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

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Connection status banner */}
      {sessionId && !isConnected && (
        <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 flex items-center justify-between">
          <span>Disconnected from chat session</span>
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
          projectId={id!}
          sessionId={sessionId}
          messages={allMessages}
          toolResults={toolResults}
          isLoading={isLoading}
          error={error}
          isStreaming={isStreaming}
          isLoadingHistory={isLoadingHistory}
        />
      </div>

      {/* Fixed Input Container at Bottom */}
      <div className="pb-4">
        <div className="mx-auto max-w-4xl">
          {/* Token usage display */}
          {sessionId && sessionMetadata && (
            <div className="px-4 pb-2 text-xs text-muted-foreground text-center">
              <span>
                {sessionMetadata.totalTokens.toLocaleString()} tokens used
              </span>
            </div>
          )}
          <ChatPromptInput
            onSubmit={handleSubmit}
            disabled={sessionId ? !isConnected : false}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
