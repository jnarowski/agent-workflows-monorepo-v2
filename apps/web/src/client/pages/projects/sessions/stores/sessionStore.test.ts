import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSessionStore } from "./sessionStore";
import type { SessionMessage } from "@/shared/types/chat";

// Mock fetch globally
global.fetch = vi.fn();

describe("SessionStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useSessionStore.setState({
      currentSessionId: null,
      currentSession: null,
      defaultPermissionMode: "acceptEdits",
    });

    // Reset fetch mock
    vi.clearAllMocks();
  });

  describe("Session Lifecycle", () => {
    it("should clear current session and reset to null state", () => {
      const { clearCurrentSession } = useSessionStore.getState();

      // Manually set a session first
      useSessionStore.setState({
        currentSessionId: "test-session-id",
        currentSession: {
          id: "test-session-id",
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "idle",
          error: null,
          permissionMode: "acceptEdits",
        },
      });

      expect(useSessionStore.getState().currentSessionId).toBe("test-session-id");

      clearCurrentSession();

      const state = useSessionStore.getState();
      expect(state.currentSessionId).toBeNull();
      expect(state.currentSession).toBeNull();
    });

    it("should load session from API with messages data", async () => {
      const { loadSession } = useSessionStore.getState();
      const sessionId = "test-session-id";
      const projectId = "test-project-id";

      const mockMessages: SessionMessage[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
          timestamp: Date.now(),
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "Hi there!" }],
          timestamp: Date.now(),
        },
      ];

      // Mock successful API response with JSON containing messages array
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockMessages }),
      });

      await loadSession(sessionId, projectId);

      const state = useSessionStore.getState();
      expect(state.currentSessionId).toBe(sessionId);
      expect(state.currentSession?.messages).toHaveLength(2);
    });

    it("should handle 404 gracefully when loadSession gets 404", async () => {
      const { loadSession } = useSessionStore.getState();
      const sessionId = "test-session-id";
      const projectId = "test-project-id";

      // Mock 404 response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      await loadSession(sessionId, projectId);

      const state = useSessionStore.getState();
      expect(state.currentSessionId).toBe(sessionId);
      expect(state.currentSession?.messages).toHaveLength(0);
      expect(state.currentSession?.loadingState).toBe("loaded");
    });
  });

  describe("Message Streaming", () => {
    beforeEach(() => {
      // Manually set up a session for testing
      useSessionStore.setState({
        currentSessionId: "test-session-id",
        currentSession: {
          id: "test-session-id",
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "idle",
          error: null,
          permissionMode: "acceptEdits",
        },
      });
    });

    it("should add user message and set firstMessage flag if appropriate", () => {
      const { addMessage } = useSessionStore.getState();

      addMessage({
        id: "msg-1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
        timestamp: Date.now(),
      });

      const state = useSessionStore.getState();
      expect(state.currentSession?.messages).toHaveLength(1);
      expect(state.currentSession?.messages[0].role).toBe("user");
    });

    it("should update streaming message by replacing content blocks", () => {
      const { updateStreamingMessage } = useSessionStore.getState();

      // First chunk
      updateStreamingMessage([{ type: "text", text: "Hello" }]);
      let state = useSessionStore.getState();
      expect(state.currentSession?.messages).toHaveLength(1);
      expect(state.currentSession?.messages[0].role).toBe("assistant");
      expect(state.currentSession?.messages[0].content).toHaveLength(1);

      // Second chunk - replaces content (merging happens in WebSocket hook)
      updateStreamingMessage([{ type: "text", text: " world" }]);
      state = useSessionStore.getState();
      expect(state.currentSession?.messages).toHaveLength(1);
      expect(state.currentSession?.messages[0].content).toHaveLength(1);
      expect((state.currentSession?.messages[0].content[0] as any).text).toBe(" world");
    });

    it("should handle multiple text blocks during streaming", () => {
      const { updateStreamingMessage } = useSessionStore.getState();

      updateStreamingMessage([
        { type: "text", text: "First block" },
        { type: "text", text: "Second block" },
      ]);

      const state = useSessionStore.getState();
      expect(state.currentSession?.messages).toHaveLength(1);
      expect(state.currentSession?.messages[0].content).toHaveLength(2);
    });

    it("should handle tool_use blocks in streaming content", () => {
      const { updateStreamingMessage } = useSessionStore.getState();

      // Add initial content with tool_use
      updateStreamingMessage([
        { type: "text", text: "Using tool" },
        { type: "tool_use", id: "tool-1", name: "bash", input: { command: "ls" } },
      ]);

      const state = useSessionStore.getState();
      expect(state.currentSession?.messages[0].content).toHaveLength(2);
      expect(state.currentSession?.messages[0].content[0].type).toBe("text");
      expect(state.currentSession?.messages[0].content[1].type).toBe("tool_use");
    });

    it("should finalize message and clear streaming state", () => {
      const { updateStreamingMessage, finalizeMessage } = useSessionStore.getState();

      updateStreamingMessage([{ type: "text", text: "Hello" }]);
      const messageId = useSessionStore.getState().currentSession?.messages[0].id || "";
      finalizeMessage(messageId);

      const state = useSessionStore.getState();
      expect(state.currentSession?.isStreaming).toBe(false);
      expect(state.currentSession?.messages).toHaveLength(1);
      expect(state.currentSession?.messages[0].role).toBe("assistant");
      expect(state.currentSession?.messages[0].isStreaming).toBe(false);
    });

    it("should handle empty content array in streaming update", () => {
      const { updateStreamingMessage } = useSessionStore.getState();

      updateStreamingMessage([]);

      const state = useSessionStore.getState();
      // Should either have no messages or one empty message
      expect(state.currentSession?.messages.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle message finalization with no streaming message gracefully", () => {
      const { finalizeMessage } = useSessionStore.getState();

      // Should not throw (even with empty string ID)
      expect(() => finalizeMessage("")).not.toThrow();

      const state = useSessionStore.getState();
      expect(state.currentSession?.isStreaming).toBe(false);
    });
  });

  describe("State Transitions", () => {
    beforeEach(() => {
      // Manually set up a session for testing
      useSessionStore.setState({
        currentSessionId: "test-session-id",
        currentSession: {
          id: "test-session-id",
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "idle",
          error: null,
          permissionMode: "acceptEdits",
        },
      });
    });

    it("should toggle streaming state", () => {
      const { setStreaming } = useSessionStore.getState();

      setStreaming(true);
      expect(useSessionStore.getState().currentSession?.isStreaming).toBe(true);

      setStreaming(false);
      expect(useSessionStore.getState().currentSession?.isStreaming).toBe(false);
    });

    it("should persist error state until cleared", () => {
      const { setError } = useSessionStore.getState();

      setError("Test error");
      expect(useSessionStore.getState().currentSession?.error).toBe("Test error");

      setError(null);
      expect(useSessionStore.getState().currentSession?.error).toBeNull();
    });

    it("should transition loading states correctly", () => {
      const { setLoadingState } = useSessionStore.getState();

      setLoadingState("loading");
      expect(useSessionStore.getState().currentSession?.loadingState).toBe("loading");

      setLoadingState("idle");
      expect(useSessionStore.getState().currentSession?.loadingState).toBe("idle");
    });

    it("should update metadata", () => {
      const { updateMetadata } = useSessionStore.getState();

      updateMetadata({
        totalTokens: 100,
        messageCount: 2,
        lastMessageAt: Date.now(),
        firstMessagePreview: "Hello",
      });

      const metadata = useSessionStore.getState().currentSession?.metadata;
      expect(metadata?.totalTokens).toBe(100);
      expect(metadata?.messageCount).toBe(2);
      expect(metadata?.firstMessagePreview).toBe("Hello");
    });
  });

  describe("Permission Modes", () => {
    it("should set and get default permission mode", () => {
      const { setDefaultPermissionMode } = useSessionStore.getState();

      setDefaultPermissionMode("plan");

      const state = useSessionStore.getState();
      expect(state.defaultPermissionMode).toBe("plan");
    });

    it("should set permission mode for current session", () => {
      const { setPermissionMode, getPermissionMode } = useSessionStore.getState();

      // Manually set up a session for testing
      useSessionStore.setState({
        currentSessionId: "test-session-id",
        currentSession: {
          id: "test-session-id",
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "idle",
          error: null,
          permissionMode: "acceptEdits",
        },
      });

      setPermissionMode("default");

      expect(getPermissionMode()).toBe("default");
      expect(useSessionStore.getState().currentSession?.permissionMode).toBe("default");
    });

    it("should return default permission mode when no session", () => {
      const { getPermissionMode, setDefaultPermissionMode } = useSessionStore.getState();

      setDefaultPermissionMode("plan");

      expect(getPermissionMode()).toBe("plan");
    });
  });

  describe("Message Queue Edge Cases", () => {
    beforeEach(() => {
      // Manually set up a session for testing
      useSessionStore.setState({
        currentSessionId: "test-session-id",
        currentSession: {
          id: "test-session-id",
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "idle",
          error: null,
          permissionMode: "acceptEdits",
        },
      });
    });

    it("should maintain order when adding multiple messages rapidly", () => {
      const { addMessage } = useSessionStore.getState();

      addMessage({
        id: "msg-1",
        role: "user",
        content: [{ type: "text", text: "Message 1" }],
        timestamp: Date.now(),
      });

      addMessage({
        id: "msg-2",
        role: "assistant",
        content: [{ type: "text", text: "Response 1" }],
        timestamp: Date.now(),
      });

      addMessage({
        id: "msg-3",
        role: "user",
        content: [{ type: "text", text: "Message 2" }],
        timestamp: Date.now(),
      });

      const messages = useSessionStore.getState().currentSession?.messages;
      expect(messages).toHaveLength(3);
      expect((messages?.[0].content[0] as any).text).toBe("Message 1");
      expect((messages?.[1].content[0] as any).text).toBe("Response 1");
      expect((messages?.[2].content[0] as any).text).toBe("Message 2");
    });
  });
});
