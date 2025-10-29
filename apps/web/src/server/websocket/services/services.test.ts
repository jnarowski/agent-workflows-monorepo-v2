import { describe, test, expect } from "vitest";
import { extractUsageFromEvents } from "./usage-extractor.js";

describe("WebSocket Services", () => {
  // Note: validateSessionOwnership tests require real database and are covered by integration tests

  describe("extractUsageFromEvents", () => {
    test("extracts usage from event.usage field", () => {
      const events = [
        { role: "user", content: "Hello" },
        {
          role: "assistant",
          content: "Hi",
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_creation_input_tokens: 10,
            cache_read_input_tokens: 5,
          },
        },
      ];

      const usage = extractUsageFromEvents(events);

      expect(usage).toEqual({
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 10,
        cache_read_input_tokens: 5,
      });
    });

    test("extracts usage from event.message.usage field (Claude format)", () => {
      const events = [
        {
          type: "assistant",
          message: {
            content: "Response",
            usage: {
              input_tokens: 200,
              output_tokens: 100,
              cache_creation_input_tokens: 20,
              cache_read_input_tokens: 10,
            },
          },
        },
      ];

      const usage = extractUsageFromEvents(events);

      expect(usage).toEqual({
        input_tokens: 200,
        output_tokens: 100,
        cache_creation_input_tokens: 20,
        cache_read_input_tokens: 10,
      });
    });

    test("returns null for empty events array", () => {
      expect(extractUsageFromEvents([])).toBeNull();
    });

    test("returns null when no usage found", () => {
      const events = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ];

      expect(extractUsageFromEvents(events)).toBeNull();
    });

    test("returns null for non-array input", () => {
      expect(extractUsageFromEvents(null)).toBeNull();
      expect(extractUsageFromEvents(undefined)).toBeNull();
      expect(extractUsageFromEvents("not an array")).toBeNull();
      expect(extractUsageFromEvents({ key: "value" })).toBeNull();
    });

    test("uses last assistant message with usage when multiple exist", () => {
      const events = [
        {
          role: "assistant",
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
        },
        {
          role: "assistant",
          usage: {
            input_tokens: 200,
            output_tokens: 100,
            cache_creation_input_tokens: 10,
            cache_read_input_tokens: 5,
          },
        },
      ];

      const usage = extractUsageFromEvents(events);

      // Should use the last message's usage
      expect(usage?.input_tokens).toBe(200);
      expect(usage?.output_tokens).toBe(100);
    });

    test("handles malformed events gracefully", () => {
      const events = [
        { role: "assistant", usage: { incomplete: "data" } },
        { role: "assistant", usage: null },
        { role: "assistant" },
      ];

      const usage = extractUsageFromEvents(events);

      // Should handle malformed usage data
      expect(usage).toBeTruthy();
      expect(usage?.input_tokens).toBe(0);
      expect(usage?.output_tokens).toBe(0);
    });

    test("handles missing cache tokens fields", () => {
      const events = [
        {
          role: "assistant",
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            // Missing cache fields
          },
        },
      ];

      const usage = extractUsageFromEvents(events);

      expect(usage).toEqual({
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      });
    });

    test("works with type field instead of role", () => {
      const events = [
        {
          type: "assistant",
          usage: {
            input_tokens: 150,
            output_tokens: 75,
            cache_creation_input_tokens: 5,
            cache_read_input_tokens: 2,
          },
        },
      ];

      const usage = extractUsageFromEvents(events);

      expect(usage?.input_tokens).toBe(150);
      expect(usage?.output_tokens).toBe(75);
    });
  });
});
