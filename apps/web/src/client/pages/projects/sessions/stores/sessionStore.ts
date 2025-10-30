import { create } from "zustand";
import type { UnifiedMessage, UnifiedContent, ClaudePermissionMode } from '@repo/agent-cli-sdk';
import type { UIMessage } from '@/shared/types/message.types';
import type {
  AgentSessionMetadata,
  SessionResponse,
} from "@/shared/types/agent-session.types";
import type { AgentType } from "@/shared/types/agent.types";
import { api } from "@/client/lib/api-client";
import type { ProjectWithSessions } from "@/shared/types/project.types";
import { projectKeys } from "@/client/pages/projects/hooks/useProjects";
import { isSystemMessage } from '@/shared/utils/message.utils';

/**
 * Enrich messages by nesting tool_result blocks into their corresponding tool_use blocks
 * This is the ONLY transform on the frontend - happens once when loading messages
 *
 * Process:
 * 1. Filter out messages containing only system content (caveats, command tags, etc.)
 * 2. Build Map of tool_use_id → result from all tool_result blocks
 * 3. Nest results into corresponding tool_use blocks (by matching IDs)
 * 4. Filter out standalone tool_result blocks (now nested in tool_use)
 * 5. Add isStreaming: false to all loaded messages
 *
 * @example
 * // Input: Array of UnifiedMessages with separate tool_use and tool_result blocks
 * [
 *   {
 *     id: '1',
 *     role: 'assistant',
 *     content: [
 *       { type: 'text', text: 'Let me read the file' },
 *       { type: 'tool_use', id: 'tool_abc123', name: 'Read', input: { file_path: '/src/index.ts' } }
 *     ],
 *     timestamp: 1234567890
 *   },
 *   {
 *     id: '2',
 *     role: 'user',
 *     content: [
 *       { type: 'tool_result', tool_use_id: 'tool_abc123', content: 'export const foo = "bar";' }
 *     ],
 *     timestamp: 1234567891
 *   }
 * ]
 *
 * // Output: tool_result nested inside tool_use, standalone tool_result filtered out
 * [
 *   {
 *     id: '1',
 *     role: 'assistant',
 *     content: [
 *       { type: 'text', text: 'Let me read the file' },
 *       {
 *         type: 'tool_use',
 *         id: 'tool_abc123',
 *         name: 'Read',
 *         input: { file_path: '/src/index.ts' },
 *         result: { content: 'export const foo = "bar";', is_error: false }  // Nested result
 *       }
 *     ],
 *     timestamp: 1234567890,
 *     isStreaming: false
 *   }
 *   // Note: Message '2' with standalone tool_result is now filtered out
 * ]
 */
function enrichMessagesWithToolResults(messages: UnifiedMessage[]): UIMessage[] {
  // Step 1: Filter out messages with only system content
  const filteredMessages = messages.filter(msg => {
    const content = msg.content;

    // If content is a string, check if it's a system message
    if (typeof content === 'string') {
      return !isSystemMessage(content);
    }

    // If content is an array, check if all text blocks are system messages
    if (Array.isArray(content)) {
      const textBlocks = content.filter(c => c.type === 'text');

      // If no text blocks, keep the message (has other content like tools)
      if (textBlocks.length === 0) return true;

      // Filter out messages where ALL text blocks are system messages
      return !textBlocks.every(c => isSystemMessage(c.text));
    }

    // Keep messages with other content types
    return true;
  });

  // Step 2: Build lookup map of tool results
  const resultMap = new Map<string, { content: string; is_error?: boolean }>();

  for (const message of filteredMessages) {
    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'tool_result') {
          resultMap.set(block.tool_use_id, {
            content: typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content),
            is_error: block.is_error
          });
        }
      }
    }
  }

  // Step 3: Enrich tool_use blocks and filter out tool_result blocks
  return filteredMessages.map(msg => {
    if (!Array.isArray(msg.content)) {
      return { ...msg, isStreaming: false };
    }

    const enrichedContent = msg.content
      .map(block => {
        // Nest result into tool_use block
        if (block.type === 'tool_use') {
          const result = resultMap.get(block.id);
          return result ? { ...block, result } : block;
        }
        return block;
      })
      // Filter out standalone tool_result blocks (now nested in tool_use)
      .filter(block => block.type !== 'tool_result');

    return {
      ...msg,
      content: enrichedContent,
      isStreaming: false
    } as UIMessage;
  });
}

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
  agent: AgentType;
  model: string;
}

/**
 * Session data structure
 * Tracks all state for the current session
 */
export interface SessionData {
  id: string;
  agent: AgentType;
  messages: UIMessage[];
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
  loadSession: (sessionId: string, projectId: string, queryClient?: { getQueryData: (key: unknown) => unknown }) => Promise<void>;
  clearSession: () => void;

  // Message actions
  addMessage: (message: UIMessage) => void;
  updateStreamingMessage: (messageId: string, contentBlocks: UnifiedContent[]) => void;
  finalizeMessage: (messageId: string) => void;

  // State actions
  setStreaming: (isStreaming: boolean) => void;
  updateMetadata: (metadata: Partial<AgentSessionMetadata>) => void;
  setError: (error: string | null) => void;
  setLoadingState: (state: LoadingState) => void;

  // Permission mode actions
  setPermissionMode: (mode: ClaudePermissionMode) => void;
  getPermissionMode: () => ClaudePermissionMode;

  // Agent selection actions
  setAgent: (agent: AgentType) => void;
  getAgent: () => AgentType;

  // Model selection actions
  setModel: (model: string) => void;
  getModel: () => string;
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
    agent: "claude",
    model: "",
  },

  // Load session from server
  loadSession: async (sessionId: string, projectId: string, queryClient?: { getQueryData: (key: unknown) => unknown }) => {
    try {
      let session: SessionResponse | undefined;

      // Get session from React Query cache (useProjectsWithSessions)
      if (queryClient) {
        const cachedProjects = queryClient.getQueryData(projectKeys.withSessions()) as ProjectWithSessions[] | undefined;

        if (cachedProjects) {
          const project = cachedProjects.find((p) => p.id === projectId);
          session = project?.sessions?.find((s) => s.id === sessionId);

          if (import.meta.env.DEV && session) {
            console.log("[sessionStore] Using cached session data from projectsWithSessions");
          }
        }
      }

      // Session must be in cache (loaded via useProjectsWithSessions)
      if (!session) {
        throw new Error(`Session not found in cache: ${sessionId}. Ensure useProjectsWithSessions is loaded.`);
      }

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
      let rawMessages: UnifiedMessage[] = [];
      try {
        const data = await api.get<{ data: UnifiedMessage[] }>(
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

      // Enrich messages with nested tool results
      const messages = enrichMessagesWithToolResults(rawMessages);

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
  addMessage: (message: UIMessage) => {
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
  // Receives UnifiedContent[] blocks from streaming updates
  updateStreamingMessage: (messageId: string, contentBlocks: UnifiedContent[]) => {
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

  // Set agent in form
  setAgent: (agent: AgentType) => {
    set((state) => ({
      form: {
        ...state.form,
        agent,
      },
    }));
  },

  // Get agent from form
  getAgent: () => {
    const state = get();
    return state.form.agent;
  },

  // Set model in form
  setModel: (model: string) => {
    set((state) => ({
      form: {
        ...state.form,
        model,
      },
    }));
  },

  // Get model from form
  getModel: () => {
    const state = get();
    return state.form.model;
  },
}));

/**
 * Memoized selector to calculate total tokens from all assistant messages
 *
 * Token counting methodology:
 * - input_tokens: Fresh input tokens (non-cached)
 * - output_tokens: Model's generated response
 *
 * Note: Cache-related tokens (cache_creation_input_tokens, cache_read_input_tokens)
 * are NOT counted here as they represent optimization metrics, not actual token usage.
 * Only counting the "new" tokens actually processed.
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
      (usage.inputTokens || 0) +
      (usage.outputTokens || 0)
      // Note: NOT counting cache tokens - those are optimization metrics
    );
  }, 0);
};
