import React, { createContext, useContext, useState, useCallback } from "react";
import type { AgentSessionMetadata } from "@/shared/types";

interface ActiveSession {
  sessionId: string;
  wsConnection?: WebSocket;
  metadata?: AgentSessionMetadata;
}

interface ChatContextValue {
  activeSessions: Map<string, ActiveSession>;
  currentSessionId: string | null;
  setCurrentSession: (sessionId: string | null) => void;
  createSession: (sessionId: string) => void;
  updateSessionMetadata: (
    sessionId: string,
    metadata: Partial<AgentSessionMetadata>
  ) => void;
  setWebSocketConnection: (sessionId: string, ws: WebSocket) => void;
  removeWebSocketConnection: (sessionId: string) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [activeSessions, setActiveSessions] = useState<
    Map<string, ActiveSession>
  >(new Map());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const setCurrentSession = useCallback((sessionId: string | null) => {
    setCurrentSessionId(sessionId);
  }, []);

  const createSession = useCallback((sessionId: string) => {
    setActiveSessions((prev) => {
      const next = new Map(prev);
      if (!next.has(sessionId)) {
        next.set(sessionId, { sessionId });
      }
      return next;
    });
  }, []);

  const updateSessionMetadata = useCallback(
    (sessionId: string, metadata: Partial<AgentSessionMetadata>) => {
      setActiveSessions((prev) => {
        const next = new Map(prev);
        const session = next.get(sessionId);
        if (session) {
          next.set(sessionId, {
            ...session,
            metadata: {
              ...session.metadata,
              ...metadata,
            } as AgentSessionMetadata,
          });
        }
        return next;
      });
    },
    []
  );

  const setWebSocketConnection = useCallback(
    (sessionId: string, ws: WebSocket) => {
      setActiveSessions((prev) => {
        const next = new Map(prev);
        const session = next.get(sessionId) || { sessionId };
        next.set(sessionId, {
          ...session,
          wsConnection: ws,
        });
        return next;
      });
    },
    []
  );

  const removeWebSocketConnection = useCallback((sessionId: string) => {
    setActiveSessions((prev) => {
      const next = new Map(prev);
      const session = next.get(sessionId);
      if (session) {
        // Close existing WebSocket if present
        if (session.wsConnection) {
          session.wsConnection.close();
        }
        next.set(sessionId, {
          ...session,
          wsConnection: undefined,
        });
      }
      return next;
    });
  }, []);

  const value: ChatContextValue = {
    activeSessions,
    currentSessionId,
    setCurrentSession,
    createSession,
    updateSessionMetadata,
    setWebSocketConnection,
    removeWebSocketConnection,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
