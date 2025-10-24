import { describe, it, expect } from 'vitest';
import { transformMessages } from './transformMessages';

describe('transformMessages', () => {
  describe('basic transformation', () => {
    it('should transform raw messages to SessionMessage format', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
          timestamp: 1234567890,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hi there!' }],
          timestamp: 1234567891,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'msg-1',
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
        timestamp: 1234567890,
        metadata: undefined,
      });
      expect(result[1]).toEqual({
        id: 'msg-2',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi there!' }],
        timestamp: 1234567891,
        metadata: undefined,
      });
    });

    it('should preserve metadata when present', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
          timestamp: 1234567890,
          metadata: { model: 'claude-3', usage: { tokens: 100 } },
        },
      ];

      const result = transformMessages(raw);

      expect(result[0].metadata).toEqual({
        model: 'claude-3',
        usage: { tokens: 100 },
      });
    });
  });

  describe('system message filtering', () => {
    it('should filter out messages with <command-name> tags', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
          timestamp: 1234567890,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: [{ type: 'text', text: '<command-name>foo</command-name>' }],
          timestamp: 1234567891,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-1');
    });

    it('should filter out messages with <system-reminder> tags', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: '<system-reminder>Remember to...</system-reminder>' }],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(0);
    });

    it('should filter out "Warmup" messages', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: 'Warmup' }],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(0);
    });

    it('should filter out Task Master JSON prompts', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: '{"subtasks": ["task1", "task2"]}' }],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(0);
    });

    it('should filter out session continuation messages', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: 'This session is being continued from a previous session' }],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(0);
    });

    it('should filter out caveat messages', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: 'Caveat: This is important' }],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(0);
    });

    it('should filter out API error messages', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: 'Invalid API key provided' }],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(0);
    });
  });

  describe('mixed content handling', () => {
    it('should preserve messages with tool_use blocks', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [
            { type: 'text', text: 'Let me help with that' },
            { type: 'tool_use', id: 'tool-1', name: 'bash', input: { command: 'ls' } },
          ],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(1);
      expect(result[0].content).toHaveLength(2);
    });

    it('should preserve messages with tool_result blocks', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 'tool-1', content: 'file1.txt\nfile2.txt' },
          ],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(1);
    });

    it('should preserve messages with thinking blocks', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'Let me think about this...' },
            { type: 'text', text: 'Here is my answer' },
          ],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(1);
      expect(result[0].content).toHaveLength(2);
    });

    it('should filter messages with ONLY system text blocks', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [
            { type: 'text', text: '<command-name>foo</command-name>' },
            { type: 'text', text: '<command-message>Processing...</command-message>' },
          ],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(0);
    });

    it('should preserve messages with mixed system and normal text', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [
            { type: 'text', text: 'Here is the output:' },
            { type: 'text', text: '<command-name>foo</command-name>' },
          ],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      // This message has mixed content (normal + system), so it's preserved
      expect(result).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const result = transformMessages([]);
      expect(result).toEqual([]);
    });

    it('should handle messages with empty content arrays', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'user',
          content: [],
          timestamp: 1234567890,
        },
      ];

      const result = transformMessages(raw);

      // Empty content is not filtered
      expect(result).toHaveLength(1);
    });

    it('should handle multiple consecutive system messages', () => {
      const raw = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: 'Warmup' }],
          timestamp: 1234567890,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: [{ type: 'text', text: '<system-reminder>Test</system-reminder>' }],
          timestamp: 1234567891,
        },
        {
          id: 'msg-3',
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
          timestamp: 1234567892,
        },
      ];

      const result = transformMessages(raw);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-3');
    });
  });
});
