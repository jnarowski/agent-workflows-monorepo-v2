import { create } from "zustand";
import type {
  SessionMessage,
  ContentBlock,
} from "@/shared/types/message.types";
import type {
  AgentSessionMetadata,
  SessionResponse,
} from "@/shared/types/agent-session.types";
import type { AgentType } from "@/shared/types/agent.types";
import { getAgent } from "@/client/lib/agents";
import { api } from "@/client/lib/api-client";

// Permission mode types from agent-cli-sdk
export type ClaudePermissionMode =
  | "default"
  | "plan"
  | "acceptEdits"
  | "reject";

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
  currentMessageTokens: number; // Tokens for the currently streaming message
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
    try {
      // First, fetch session details to get agent type
      const sessionData = await api.get<{ data: SessionResponse[] }>(
        `/api/projects/${projectId}/sessions`
      );
      const sessions: SessionResponse[] = sessionData.data || [];
      const session = sessions.find((s) => s.id === sessionId);

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Get agent implementation for this session
      const agent = getAgent(session.agent);

      // Set loading state with agent type and metadata
      set({
        currentSessionId: sessionId,
        currentSession: {
          id: sessionId,
          agent: session.agent,
          messages: [],
          isStreaming: false,
          metadata: session.metadata || null,
          loadingState: "loading",
          error: null,
          permissionMode: get().defaultPermissionMode,
          currentMessageTokens: 0,
        },
      });

      // Now fetch messages
      let rawMessages: SessionMessage[] = [];
      try {
        const data = await api.get<{ data: SessionMessage[] }>(
          `/api/projects/${projectId}/sessions/${sessionId}/messages`
        );
        rawMessages = data.data || [];
      } catch (error) {
        // JSONL file doesn't exist yet - this is expected for new sessions
        if (error instanceof Error && error.message.includes("404")) {
          console.log(
            `[sessionStore] JSONL file not found for session ${sessionId} - this is normal for new sessions`
          );
          set((state) => ({
            currentSession: state.currentSession
              ? { ...state.currentSession, loadingState: "loaded" }
              : null,
          }));
          return;
        }
        throw error;
      }

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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load session";
      console.error(`[sessionStore] Error loading session:`, errorMessage);
      set((state) => ({
        currentSession: state.currentSession
          ? {
              ...state.currentSession,
              loadingState: "error",
              error: errorMessage,
            }
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
          // Reset current message tokens when user sends a new message
          currentMessageTokens:
            message.role === "user"
              ? 0
              : state.currentSession.currentMessageTokens,
        },
      };
    });
  },

  // Update the streaming message content
  // Receives already-transformed ContentBlock[] from agent.transformStreaming()
  updateStreamingMessage: (messageId: string, contentBlocks: ContentBlock[]) => {
    set((state) => {
      if (!state.currentSession) {
        return state;
      }

      const messages = state.currentSession.messages;
      const lastMessage = messages[messages.length - 1];

      // Check if last message has the same ID (update existing message)
      const shouldUpdateLastMessage =
        lastMessage &&
        lastMessage.role === "assistant" &&
        lastMessage.isStreaming === true &&
        lastMessage.id === messageId;

      if (shouldUpdateLastMessage) {
        // Update existing streaming message with same ID immutably
        return {
          currentSession: {
            ...state.currentSession,
            messages: [
              ...messages.slice(0, -1),
              {
                ...lastMessage,
                content: contentBlocks,
              },
            ],
            isStreaming: true,
          },
        };
      } else {
        // Create new streaming assistant message with the provided ID
        return {
          currentSession: {
            ...state.currentSession,
            messages: [
              ...messages,
              {
                id: messageId,
                role: "assistant" as const,
                content: contentBlocks,
                timestamp: Date.now(),
                isStreaming: true,
              },
            ],
            isStreaming: true,
          },
        };
      }
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
  updateMetadata: (
    metadata: Partial<AgentSessionMetadata> & {
      usage?: { input_tokens?: number; output_tokens?: number };
    }
  ) => {
    set((state) => {
      if (!state.currentSession) return state;

      // Calculate current message tokens from usage data if provided
      let currentMessageTokens = state.currentSession.currentMessageTokens;
      let updatedTotalTokens = state.currentSession.metadata?.totalTokens || 0;

      if (metadata.usage) {
        const inputTokens = metadata.usage.input_tokens || 0;
        const outputTokens = metadata.usage.output_tokens || 0;
        currentMessageTokens = inputTokens + outputTokens;

        // Add current message tokens to total
        updatedTotalTokens += currentMessageTokens;
      }

      return {
        currentSession: {
          ...state.currentSession,
          metadata: {
            ...(state.currentSession.metadata || {
              totalTokens: 0,
              messageCount: 0,
              lastMessageAt: "",
              firstMessagePreview: "",
            }),
            ...metadata,
            totalTokens: updatedTotalTokens,
          } as AgentSessionMetadata,
          currentMessageTokens,
        },
      };
    });
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
