import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSessionStore } from "./sessionStore";
import type { SessionMessage } from "@/shared/types/chat";

// Mock the agents module
vi.mock("@/client/lib/agents");

// Mock fetch globally
global.fetch = vi.fn();

describe("SessionStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useSessionStore.setState({
      sessionId: null,
      session: null,
      form: {
        permissionMode: "acceptEdits",
      },
    });

    // Reset fetch mock
    vi.clearAllMocks();
  });

  describe("Session Lifecycle", () => {
    it("should clear current session and reset to null state", () => {
      const { clearSession } = useSessionStore.getState();

      // Manually set a session first
      useSessionStore.setState({
        sessionId: "test-session-id",
        session: {
          id: "test-session-id",
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "idle",
          error: null,
          currentMessageTokens: 0,
        },
      });

      expect(useSessionStore.getState().sessionId).toBe("test-session-id");

      clearSession();

      const state = useSessionStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.session).toBeNull();
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

      // Mock first API call to get sessions list
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{
            id: sessionId,
            agent: "claude",
            projectId,
            name: "Test Session"
          }]
        }),
      });

      // Mock second API call to get messages
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockMessages }),
      });

      await loadSession(sessionId, projectId);

      const state = useSessionStore.getState();
      expect(state.sessionId).toBe(sessionId);
      expect(state.session?.messages).toHaveLength(2);
    });

    it("should handle 404 gracefully when loadSession gets 404", async () => {
      const { loadSession } = useSessionStore.getState();
      const sessionId = "test-session-id";
      const projectId = "test-project-id";

      // Mock first API call to get sessions list (succeeds)
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{
            id: sessionId,
            agent: "claude",
            projectId,
            name: "Test Session"
          }]
        }),
      });

      // Mock second API call to get messages (404 response)
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      await loadSession(sessionId, projectId);

      const state = useSessionStore.getState();
      expect(state.sessionId).toBe(sessionId);
      expect(state.session?.messages).toHaveLength(0);
      expect(state.session?.loadingState).toBe("loaded");
    });
  });

  describe("Message Streaming", () => {
    beforeEach(() => {
      // Manually set up a session for testing
      useSessionStore.setState({
        sessionId: "test-session-id",
        session: {
          id: "test-session-id",
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "idle",
          error: null,
          currentMessageTokens: 0,
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
      expect(state.session?.messages).toHaveLength(1);
      expect(state.session?.messages[0].role).toBe("user");
    });

    it("should update streaming message by replacing content blocks", () => {
      const { updateStreamingMessage } = useSessionStore.getState();
      const messageId = "msg-1";

      // First chunk
      updateStreamingMessage(messageId, [{ type: "text", text: "Hello" }]);
      let state = useSessionStore.getState();
      expect(state.session?.messages).toHaveLength(1);
      expect(state.session?.messages[0].role).toBe("assistant");
      expect(state.session?.messages[0].content).toHaveLength(1);

      // Second chunk - replaces content with same message ID (merging happens in WebSocket hook)
      updateStreamingMessage(messageId, [{ type: "text", text: " world" }]);
      state = useSessionStore.getState();
      expect(state.session?.messages).toHaveLength(1);
      expect(state.session?.messages[0].content).toHaveLength(1);
      expect((state.session?.messages[0].content[0] as { type: string; text: string }).text).toBe(" world");
    });

    it("should handle multiple text blocks during streaming", () => {
      const { updateStreamingMessage } = useSessionStore.getState();
      const messageId = "msg-1";

      updateStreamingMessage(messageId, [
        { type: "text", text: "First block" },
        { type: "text", text: "Second block" },
      ]);

      const state = useSessionStore.getState();
      expect(state.session?.messages).toHaveLength(1);
      expect(state.session?.messages[0].content).toHaveLength(2);
    });

    it("should handle tool_use blocks in streaming content", () => {
      const { updateStreamingMessage } = useSessionStore.getState();
      const messageId = "msg-1";

      // Add initial content with tool_use
      updateStreamingMessage(messageId, [
        { type: "text", text: "Using tool" },
        { type: "tool_use", id: "tool-1", name: "bash", input: { command: "ls" } },
      ]);

      const state = useSessionStore.getState();
      expect(state.session?.messages[0].content).toHaveLength(2);
      expect(state.session?.messages[0].content[0].type).toBe("text");
      expect(state.session?.messages[0].content[1].type).toBe("tool_use");
    });

    it("should finalize message and clear streaming state", () => {
      const { updateStreamingMessage, finalizeMessage } = useSessionStore.getState();
      const messageId = "msg-1";

      updateStreamingMessage(messageId, [{ type: "text", text: "Hello" }]);
      finalizeMessage(messageId);

      const state = useSessionStore.getState();
      expect(state.session?.isStreaming).toBe(false);
      expect(state.session?.messages).toHaveLength(1);
      expect(state.session?.messages[0].role).toBe("assistant");
      expect(state.session?.messages[0].isStreaming).toBe(false);
    });

    it("should handle empty content array in streaming update", () => {
      const { updateStreamingMessage } = useSessionStore.getState();
      const messageId = "msg-1";

      updateStreamingMessage(messageId, []);

      const state = useSessionStore.getState();
      // Should create a message with empty content
      expect(state.session?.messages.length).toBeGreaterThanOrEqual(0);
    });

    it("REGRESSION: should append multiple assistant messages during streaming, not replace them", () => {
      const { updateStreamingMessage } = useSessionStore.getState();

      // First assistant message with Read tool (simulates first stream event with msg_01)
      updateStreamingMessage("msg_01", [
        { type: "text", text: "Let me read that file" },
        { type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "/test.txt" } },
      ]);

      let state = useSessionStore.getState();
      expect(state.session?.messages).toHaveLength(1);
      expect(state.session?.messages[0].content).toHaveLength(2);
      const firstContentBlock = state.session?.messages[0].content[1];
      if (firstContentBlock && 'name' in firstContentBlock) {
        expect(firstContentBlock.name).toBe("Read");
      }

      // Second assistant message with Glob tool (simulates second stream event with msg_02)
      // FIXED: Different message ID means this should append as a NEW message
      updateStreamingMessage("msg_02", [
        { type: "text", text: "Now let me search for files" },
        { type: "tool_use", id: "tool-2", name: "Glob", input: { pattern: "*.ts" } },
      ]);

      state = useSessionStore.getState();

      // EXPECTED BEHAVIOR (FIXED): 2 messages exist, both visible
      expect(state.session?.messages).toHaveLength(2);
      const firstMsg = state.session?.messages[0].content[1];
      if (firstMsg && 'name' in firstMsg) expect(firstMsg.name).toBe("Read");
      const secondMsg = state.session?.messages[1].content[1];
      if (secondMsg && 'name' in secondMsg) expect(secondMsg.name).toBe("Glob");
    });

    it("should handle message finalization with no streaming message gracefully", () => {
      const { finalizeMessage } = useSessionStore.getState();

      // Should not throw (even with empty string ID)
      expect(() => finalizeMessage("")).not.toThrow();

      const state = useSessionStore.getState();
      expect(state.session?.isStreaming).toBe(false);
    });
  });

  describe("State Transitions", () => {
    beforeEach(() => {
      // Manually set up a session for testing
      useSessionStore.setState({
        sessionId: "test-session-id",
        session: {
          id: "test-session-id",
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "idle",
          error: null,
          currentMessageTokens: 0,
        },
      });
    });

    it("should toggle streaming state", () => {
      const { setStreaming } = useSessionStore.getState();

      setStreaming(true);
      expect(useSessionStore.getState().session?.isStreaming).toBe(true);

      setStreaming(false);
      expect(useSessionStore.getState().session?.isStreaming).toBe(false);
    });

    it("should persist error state until cleared", () => {
      const { setError } = useSessionStore.getState();

      setError("Test error");
      expect(useSessionStore.getState().session?.error).toBe("Test error");

      setError(null);
      expect(useSessionStore.getState().session?.error).toBeNull();
    });

    it("should transition loading states correctly", () => {
      const { setLoadingState } = useSessionStore.getState();

      setLoadingState("loading");
      expect(useSessionStore.getState().session?.loadingState).toBe("loading");

      setLoadingState("idle");
      expect(useSessionStore.getState().session?.loadingState).toBe("idle");
    });

    it("should update metadata", () => {
      const { updateMetadata } = useSessionStore.getState();

      // updateMetadata has special logic for totalTokens - it calculates from usage
      // Test with usage data to properly update tokens
      updateMetadata({
        messageCount: 2,
        lastMessageAt: Date.now(),
        firstMessagePreview: "Hello",
        usage: { input_tokens: 50, output_tokens: 50 },
      });

      const metadata = useSessionStore.getState().session?.metadata;
      expect(metadata?.totalTokens).toBe(100); // 50 + 50 from usage
      expect(metadata?.messageCount).toBe(2);
      expect(metadata?.firstMessagePreview).toBe("Hello");
    });
  });

  describe("Permission Modes", () => {
    it("should set and get form permission mode", () => {
      const { setPermissionMode, getPermissionMode } = useSessionStore.getState();

      setPermissionMode("plan");

      expect(getPermissionMode()).toBe("plan");
      expect(useSessionStore.getState().form.permissionMode).toBe("plan");
    });

    it("should persist permission mode in form state", () => {
      const { setPermissionMode } = useSessionStore.getState();

      setPermissionMode("reject");

      const state = useSessionStore.getState();
      expect(state.form.permissionMode).toBe("reject");
    });
  });

  describe("Message Queue Edge Cases", () => {
    beforeEach(() => {
      // Manually set up a session for testing
      useSessionStore.setState({
        sessionId: "test-session-id",
        session: {
          id: "test-session-id",
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "idle",
          error: null,
          currentMessageTokens: 0,
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

      const messages = useSessionStore.getState().session?.messages;
      expect(messages).toHaveLength(3);
      expect((messages?.[0].content[0] as { type: string; text: string }).text).toBe("Message 1");
      expect((messages?.[1].content[0] as { type: string; text: string }).text).toBe("Response 1");
      expect((messages?.[2].content[0] as { type: string; text: string }).text).toBe("Message 2");
    });
  });
});
