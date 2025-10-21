import * as React from "react";
import { useParams } from "react-router-dom";
import { ChatInterface } from "../components/chat/ChatInterface";
import { ChatPromptInput } from "../components/chat/ChatPromptInput";
import { useClaudeSession } from "../hooks/useClaudeSession";
import { useChatContext } from "../contexts/ChatContext";

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

  // Set current session in context
  React.useEffect(() => {
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
          messages={messages}
          toolResults={toolResults}
          isLoading={isLoading}
          error={error}
          isStreaming={isStreaming}
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
