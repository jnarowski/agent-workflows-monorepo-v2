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
 * Prompt input form state
 * Tracks the current state of the prompt input form
 */
export interface FormState {
  permissionMode: ClaudePermissionMode;
}

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
}

/**
 * SessionStore state and actions
 * Manages a single current session (not a Map)
 */
export interface SessionStore {
  // State
  sessionId: string | null;
  session: SessionData | null;
  form: FormState;

  // Session lifecycle actions
  loadSession: (sessionId: string, projectId: string) => Promise<void>;
  clearSession: () => void;

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
  setPermissionMode: (mode: ClaudePermissionMode) => void;
  getPermissionMode: () => ClaudePermissionMode;
}

/**
 * Session store - manages the current session
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  sessionId: null,
  session: null,
  form: {
    permissionMode: "acceptEdits",
  },

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
        sessionId: sessionId,
        session: {
          id: sessionId,
          agent: session.agent,
          messages: [],
          isStreaming: false,
          metadata: session.metadata || null,
          loadingState: "loading",
          error: null,
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
          if (import.meta.env.DEV) {
            console.log(
              `[sessionStore] JSONL file not found for session ${sessionId} - this is normal for new sessions`
            );
          }
          set((state) => ({
            session: state.session
              ? { ...state.session, loadingState: "loaded" }
              : null,
          }));
          return;
        }
        throw error;
      }

      // Transform messages using agent's transform function
      const messages = agent.transformMessages(rawMessages);

      set((state) => ({
        session: state.session
          ? {
              ...state.session,
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
        session: state.session
          ? {
              ...state.session,
              loadingState: "error",
              error: errorMessage,
            }
          : null,
      }));
      throw error;
    }
  },

  // Clear current session
  clearSession: () => {
    set({
      sessionId: null,
      session: null,
    });
  },

  // Add a message to the current session
  addMessage: (message: SessionMessage) => {
    set((state) => {
      if (!state.session) return state;

      return {
        session: {
          ...state.session,
          messages: [...state.session.messages, message],
        },
      };
    });
  },

  // Update the streaming message content
  // Receives already-transformed ContentBlock[] from agent.transformStreaming()
  updateStreamingMessage: (messageId: string, contentBlocks: ContentBlock[]) => {
    set((state) => {
      if (!state.session) {
        return state;
      }

      const messages = state.session.messages;
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
          session: {
            ...state.session,
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
          session: {
            ...state.session,
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
      if (!state.session) return state;

      const messages = state.session.messages.map((msg) =>
        msg.id === messageId || msg.isStreaming
          ? { ...msg, isStreaming: false }
          : msg
      );

      return {
        session: {
          ...state.session,
          messages,
          isStreaming: false,
        },
      };
    });
  },

  // Set streaming state
  setStreaming: (isStreaming: boolean) => {
    set((state) => ({
      session: state.session
        ? { ...state.session, isStreaming }
        : null,
    }));
  },

  // Update metadata
  updateMetadata: (metadata: Partial<AgentSessionMetadata>) => {
    set((state) => {
      if (!state.session) return state;

      return {
        session: {
          ...state.session,
          metadata: {
            ...(state.session.metadata || {
              totalTokens: 0,
              messageCount: 0,
              lastMessageAt: "",
              firstMessagePreview: "",
            }),
            ...metadata,
          } as AgentSessionMetadata,
        },
      };
    });
  },

  // Set error state
  setError: (error: string | null) => {
    set((state) => ({
      session: state.session
        ? { ...state.session, error }
        : null,
    }));
  },

  // Set loading state
  setLoadingState: (loadingState: LoadingState) => {
    set((state) => ({
      session: state.session
        ? { ...state.session, loadingState }
        : null,
    }));
  },

  // Set permission mode in form
  setPermissionMode: (mode: ClaudePermissionMode) => {
    set((state) => ({
      form: {
        ...state.form,
        permissionMode: mode,
      },
    }));
  },

  // Get permission mode from form
  getPermissionMode: () => {
    const state = get();
    return state.form.permissionMode;
  },
}));

/**
 * Memoized selector to calculate total tokens from all assistant messages
 * Returns the sum of all token types: input, output, cache_creation, cache_read
 */
export const selectTotalTokens = (state: SessionStore): number => {
  if (!state.session?.messages) return 0;

  return state.session.messages.reduce((total, message) => {
    // Only count assistant messages that have usage data
    if (message.role !== "assistant" || !message.usage) {
      return total;
    }

    const usage = message.usage;
    return (
      total +
      (usage.input_tokens || 0) +
      (usage.output_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens || 0)
    );
  }, 0);
};
