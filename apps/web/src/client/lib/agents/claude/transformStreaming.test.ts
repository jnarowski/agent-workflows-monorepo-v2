import { describe, it, expect } from "vitest";
import { transformStreaming } from "./transformStreaming";
import type { SessionStreamOutputData } from "@/shared/types/websocket";

describe("transformStreaming", () => {
  it("should return null when no events are present", () => {
    const data: SessionStreamOutputData = {
      content: {
        events: [],
      },
    };

    const result = transformStreaming(data);
    expect(result).toBeNull();
  });

  it("should return null when content is undefined", () => {
    const data = {} as SessionStreamOutputData;
    const result = transformStreaming(data);
    expect(result).toBeNull();
  });

  it("should extract content from assistant message event", () => {
    const data: SessionStreamOutputData = {
      content: {
        events: [
          {
            type: "assistant",
            message: {
              model: "claude-sonnet-4-5-20250929",
              id: "msg_01ABC123",
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: "Hello! How can I help you?",
                },
              ],
              stop_reason: null,
              stop_sequence: null,
              usage: {
                input_tokens: 10,
                output_tokens: 20,
              },
            },
          },
        ],
      },
    };

    const result = transformStreaming(data);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("msg_01ABC123");
    expect(result?.content).toHaveLength(1);
    expect(result?.content[0]).toEqual({
      type: "text",
      text: "Hello! How can I help you?",
    });
  });

  it("should extract multiple content blocks from assistant message", () => {
    const data: SessionStreamOutputData = {
      content: {
        events: [
          {
            type: "assistant",
            message: {
              model: "claude-sonnet-4-5-20250929",
              id: "msg_01ABC123",
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: "I'll help you with that.",
                },
                {
                  type: "tool_use",
                  id: "toolu_123",
                  name: "Read",
                  input: {
                    file_path: "/path/to/file",
                  },
                },
              ],
              stop_reason: null,
              stop_sequence: null,
              usage: {
                input_tokens: 10,
                output_tokens: 20,
              },
            },
          },
        ],
      },
    };

    const result = transformStreaming(data);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("msg_01ABC123");
    expect(result?.content).toHaveLength(2);
    expect(result?.content[0]).toEqual({
      type: "text",
      text: "I'll help you with that.",
    });
    expect(result?.content[1]).toEqual({
      type: "tool_use",
      id: "toolu_123",
      name: "Read",
      input: {
        file_path: "/path/to/file",
      },
    });
  });

  it("should skip system events and return null", () => {
    const data: SessionStreamOutputData = {
      content: {
        events: [
          {
            type: "system",
            subtype: "init",
            session_id: "test-session",
            tools: ["Read", "Write"],
          },
        ],
      },
    };

    const result = transformStreaming(data);
    expect(result).toBeNull();
  });

  it("should skip result events and return null", () => {
    const data: SessionStreamOutputData = {
      content: {
        events: [
          {
            type: "result",
            subtype: "success",
            is_error: false,
            duration_ms: 1000,
            result: "Success",
            session_id: "test-session",
          },
        ],
      },
    };

    const result = transformStreaming(data);
    expect(result).toBeNull();
  });

  it("should handle thinking blocks in assistant message", () => {
    const data: SessionStreamOutputData = {
      content: {
        events: [
          {
            type: "assistant",
            message: {
              model: "claude-sonnet-4-5-20250929",
              id: "msg_01ABC123",
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "thinking",
                  thinking: "Let me analyze this...",
                },
                {
                  type: "text",
                  text: "Here's my response.",
                },
              ],
              stop_reason: null,
              stop_sequence: null,
              usage: {
                input_tokens: 10,
                output_tokens: 20,
              },
            },
          },
        ],
      },
    };

    const result = transformStreaming(data);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("msg_01ABC123");
    expect(result?.content).toHaveLength(2);
    expect(result?.content[0]).toEqual({
      type: "thinking",
      thinking: "Let me analyze this...",
    });
    expect(result?.content[1]).toEqual({
      type: "text",
      text: "Here's my response.",
    });
  });

  it("REGRESSION: should only process assistant event and ignore subsequent result event", () => {
    // This test ensures that when multiple events come in sequence,
    // we only extract content from the assistant event and ignore result events
    // This was the bug: result events were returning empty arrays and overwriting content

    const systemEvent = {
      type: "system",
      subtype: "init",
      session_id: "test-session",
    };

    const assistantEvent = {
      type: "assistant",
      message: {
        model: "claude-sonnet-4-5-20250929",
        id: "msg_01ABC123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Hello! How can I help you?",
          },
        ],
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      },
    };

    const resultEvent = {
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 1000,
      result: "Hello! How can I help you?",
      session_id: "test-session",
    };

    // Test system event alone
    const systemData: SessionStreamOutputData = {
      content: {
        events: [systemEvent],
      },
    };
    expect(transformStreaming(systemData)).toBeNull();

    // Test assistant event alone
    const assistantData: SessionStreamOutputData = {
      content: {
        events: [assistantEvent],
      },
    };
    const assistantResult = transformStreaming(assistantData);
    expect(assistantResult).not.toBeNull();
    expect(assistantResult?.id).toBe("msg_01ABC123");
    expect(assistantResult?.content).toHaveLength(1);
    expect(assistantResult?.content[0]).toEqual({
      type: "text",
      text: "Hello! How can I help you?",
    });

    // Test result event alone
    const resultData: SessionStreamOutputData = {
      content: {
        events: [resultEvent],
      },
    };
    expect(transformStreaming(resultData)).toBeNull();

    // CRITICAL: Test the actual sequence that caused the bug
    // system -> assistant -> result
    // Only the assistant event should produce content
    const sequenceData: SessionStreamOutputData = {
      content: {
        events: [systemEvent, assistantEvent, resultEvent],
      },
    };
    const sequenceResult = transformStreaming(sequenceData);
    expect(sequenceResult).not.toBeNull();
    expect(sequenceResult?.id).toBe("msg_01ABC123");
    expect(sequenceResult?.content).toHaveLength(1);
    expect(sequenceResult?.content[0]).toEqual({
      type: "text",
      text: "Hello! How can I help you?",
    });
  });

  it("should return immediately when assistant event is found (early exit)", () => {
    // This test verifies that we return as soon as we find an assistant event
    // and don't process any subsequent events
    const data: SessionStreamOutputData = {
      content: {
        events: [
          {
            type: "system",
            subtype: "init",
          },
          {
            type: "assistant",
            message: {
              model: "claude-sonnet-4-5-20250929",
              id: "msg_01ABC123",
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: "First response",
                },
              ],
              stop_reason: null,
              stop_sequence: null,
              usage: {
                input_tokens: 10,
                output_tokens: 20,
              },
            },
          },
          {
            // This should never be processed due to early return
            type: "assistant",
            message: {
              model: "claude-sonnet-4-5-20250929",
              id: "msg_01DEF456",
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: "Second response (should not appear)",
                },
              ],
              stop_reason: null,
              stop_sequence: null,
              usage: {
                input_tokens: 10,
                output_tokens: 20,
              },
            },
          },
        ],
      },
    };

    const result = transformStreaming(data);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("msg_01ABC123");
    expect(result?.content).toHaveLength(1);
    expect(result?.content[0]).toEqual({
      type: "text",
      text: "First response",
    });
  });
});
