import { create } from "zustand";
import type { SessionMessage, ContentBlock } from "@/shared/types/chat";
import type { AgentSessionMetadata, SessionResponse } from "@/shared/types/agent-session.types";
import type { AgentType } from "@/shared/types/agent.types";
import { useAuthStore } from "@/client/stores/authStore";
import { getAgent } from "@/client/lib/agents";

// Permission mode types from agent-cli-sdk
export type ClaudePermissionMode = "default" | "plan" | "acceptEdits" | "reject";

/**
 * Loading states for async operations
 */
export type LoadingState = "idle" | "loading" | "loaded" | "error";

/**
 * Session data structure
 * Tracks all state for the current session
 */
export interface SessionData {
  id: string;
  agent: AgentType;
  messages: SessionMessage[];
  isStreaming: boolean;
  metadata: AgentSessionMetadata | null;
  loadingState: LoadingState;
  error: string | null;
  permissionMode: ClaudePermissionMode;
}

/**
 * SessionStore state and actions
 * Manages a single current session (not a Map)
 */
export interface SessionStore {
  // State
  currentSessionId: string | null;
  currentSession: SessionData | null;
  defaultPermissionMode: ClaudePermissionMode;

  // Session lifecycle actions
  loadSession: (sessionId: string, projectId: string) => Promise<void>;
  clearCurrentSession: () => void;

  // Message actions
  addMessage: (message: SessionMessage) => void;
  updateStreamingMessage: (contentBlocks: ContentBlock[]) => void;
  finalizeMessage: (messageId: string) => void;

  // State actions
  setStreaming: (isStreaming: boolean) => void;
  updateMetadata: (metadata: Partial<AgentSessionMetadata>) => void;
  setError: (error: string | null) => void;
  setLoadingState: (state: LoadingState) => void;

  // Permission mode actions
  setDefaultPermissionMode: (mode: ClaudePermissionMode) => void;
  setPermissionMode: (mode: ClaudePermissionMode) => void;
  getPermissionMode: () => ClaudePermissionMode;
}

/**
 * Session store - manages the current session
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  currentSessionId: null,
  currentSession: null,
  defaultPermissionMode: "acceptEdits",

  // Load session from server
  loadSession: async (sessionId: string, projectId: string) => {
    // Get auth token
    const token = useAuthStore.getState().token;

    try {
      // First, fetch session details to get agent type
      const sessionResponse = await fetch(`/api/projects/${projectId}/sessions`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to fetch session list: ${sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();
      const sessions: SessionResponse[] = sessionData.data || [];
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Get agent implementation for this session
      const agent = getAgent(session.agent);

      // Set loading state with agent type
      set({
        currentSessionId: sessionId,
        currentSession: {
          id: sessionId,
          agent: session.agent,
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "loading",
          error: null,
          permissionMode: get().defaultPermissionMode,
        },
      });

      // Now fetch messages
      const response = await fetch(`/api/projects/${projectId}/sessions/${sessionId}/messages`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.status === 404) {
        // JSONL file doesn't exist yet - this is expected for new sessions
        console.log(`[sessionStore] JSONL file not found for session ${sessionId} - this is normal for new sessions`);
        set((state) => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, loadingState: "loaded" }
            : null,
        }));
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.statusText}`);
      }

      const data = await response.json();
      const rawMessages = data.data || [];

      // Transform messages using agent's transform function
      const messages = agent.transformMessages(rawMessages);

      set((state) => ({
        currentSession: state.currentSession
          ? {
              ...state.currentSession,
              messages,
              loadingState: "loaded",
            }
          : null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load session";
      console.error(`[sessionStore] Error loading session:`, errorMessage);
      set((state) => ({
        currentSession: state.currentSession
          ? { ...state.currentSession, loadingState: "error", error: errorMessage }
          : null,
      }));
      throw error;
    }
  },

  // Clear current session
  clearCurrentSession: () => {
    set({
      currentSessionId: null,
      currentSession: null,
    });
  },

  // Add a message to the current session
  addMessage: (message: SessionMessage) => {
    set((state) => {
      if (!state.currentSession) return state;

      return {
        currentSession: {
          ...state.currentSession,
          messages: [...state.currentSession.messages, message],
        },
      };
    });
  },

  // Update the streaming message content
  updateStreamingMessage: (contentBlocks: ContentBlock[]) => {
    console.log("[sessionStore] updateStreamingMessage called with:", contentBlocks);
    set((state) => {
      if (!state.currentSession) {
        console.log("[sessionStore] No currentSession, skipping update");
        return state;
      }

      console.log("[sessionStore] Current session ID:", state.currentSession.id);
      console.log("[sessionStore] Current messages count:", state.currentSession.messages.length);

      const messages = [...state.currentSession.messages];
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage || lastMessage.role !== "assistant") {
        // No assistant message to update, create one
        console.log("[sessionStore] Creating new assistant message");
        const newMessage: SessionMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: contentBlocks,
          timestamp: Date.now(),
          isStreaming: true,
        };
        return {
          currentSession: {
            ...state.currentSession,
            messages: [...messages, newMessage],
            isStreaming: true,
          },
        };
      }

      // Update the last assistant message
      console.log("[sessionStore] Updating existing assistant message");
      lastMessage.content = contentBlocks;
      lastMessage.isStreaming = true;

      return {
        currentSession: {
          ...state.currentSession,
          messages,
          isStreaming: true,
        },
      };
    });
  },

  // Finalize the streaming message
  finalizeMessage: (messageId: string) => {
    set((state) => {
      if (!state.currentSession) return state;

      const messages = state.currentSession.messages.map((msg) =>
        msg.id === messageId || msg.isStreaming
          ? { ...msg, isStreaming: false }
          : msg
      );

      return {
        currentSession: {
          ...state.currentSession,
          messages,
          isStreaming: false,
        },
      };
    });
  },

  // Set streaming state
  setStreaming: (isStreaming: boolean) => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, isStreaming }
        : null,
    }));
  },

  // Update metadata
  updateMetadata: (metadata: Partial<AgentSessionMetadata>) => {
    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            metadata: { ...state.currentSession.metadata, ...metadata } as AgentSessionMetadata,
          }
        : null,
    }));
  },

  // Set error state
  setError: (error: string | null) => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, error }
        : null,
    }));
  },

  // Set loading state
  setLoadingState: (loadingState: LoadingState) => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, loadingState }
        : null,
    }));
  },

  // Set default permission mode
  setDefaultPermissionMode: (mode: ClaudePermissionMode) => {
    set({ defaultPermissionMode: mode });
  },

  // Set permission mode for current session
  setPermissionMode: (mode: ClaudePermissionMode) => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, permissionMode: mode }
        : null,
    }));
  },

  // Get permission mode for current session
  getPermissionMode: () => {
    const state = get();
    return state.currentSession?.permissionMode ?? state.defaultPermissionMode;
  },
}));
