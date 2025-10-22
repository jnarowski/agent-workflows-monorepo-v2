import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { ChatInterface } from "../components/chat/ChatInterface";
import { ChatPromptInput } from "../components/chat/ChatPromptInput";
import { useClaudeSession } from "../hooks/useClaudeSession";
import { useChatContext } from "../contexts/ChatContext";
import { useSessionMessages } from "../hooks/useSessionMessages";

export default function ProjectChat() {
  const { id, sessionId } = useParams<{ id: string; sessionId?: string }>();
  const { setCurrentSession, activeSessions } = useChatContext();

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

  const handleSubmit = async (message: string, images?: File[]) => {
    console.log('[ProjectChat] handleSubmit called:', {
      message: message.substring(0, 100),
      imagesCount: images?.length || 0,
      hasSendMessage: !!sendMessage,
      sessionId,
      isConnected
    });

    if (!sendMessage) {
      console.error('[ProjectChat] sendMessage is not available');
      return;
    }

    if (!sessionId) {
      console.error('[ProjectChat] sessionId is missing');
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
            disabled={!sessionId || !isConnected}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
