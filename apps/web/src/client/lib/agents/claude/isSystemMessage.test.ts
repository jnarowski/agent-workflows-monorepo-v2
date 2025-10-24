import { describe, it, expect } from 'vitest';
import { isSystemMessage } from './isSystemMessage';

describe('isSystemMessage', () => {
  describe('command tags', () => {
    it('should detect <command-name> tags', () => {
      expect(isSystemMessage('<command-name>foo</command-name>')).toBe(true);
    });

    it('should detect <command-message> tags', () => {
      expect(isSystemMessage('<command-message>Processing...</command-message>')).toBe(true);
    });

    it('should detect <command-args> tags', () => {
      expect(isSystemMessage('<command-args>{"arg": "value"}</command-args>')).toBe(true);
    });

    it('should detect <local-command-stdout> tags', () => {
      expect(isSystemMessage('<local-command-stdout>output</local-command-stdout>')).toBe(true);
    });
  });

  describe('system reminders', () => {
    it('should detect <system-reminder> tags', () => {
      expect(isSystemMessage('<system-reminder>Remember to...</system-reminder>')).toBe(true);
    });
  });

  describe('session continuity messages', () => {
    it('should detect session continuation messages', () => {
      expect(isSystemMessage('This session is being continued from a previous session')).toBe(true);
    });
  });

  describe('caveats', () => {
    it('should detect caveat messages', () => {
      expect(isSystemMessage('Caveat: This is important')).toBe(true);
    });
  });

  describe('API errors', () => {
    it('should detect invalid API key messages', () => {
      expect(isSystemMessage('Error: Invalid API key provided')).toBe(true);
    });
  });

  describe('Task Master prompts', () => {
    it('should detect Task Master JSON with subtasks', () => {
      expect(isSystemMessage('{"subtasks": ["task1", "task2"]}')).toBe(true);
    });

    it('should detect Task Master system prompts', () => {
      expect(isSystemMessage('CRITICAL: You MUST respond with ONLY a JSON object')).toBe(true);
    });
  });

  describe('warmup messages', () => {
    it('should detect exact "Warmup" message', () => {
      expect(isSystemMessage('Warmup')).toBe(true);
    });

    it('should not detect "Warmup" in longer text', () => {
      expect(isSystemMessage('Starting warmup process')).toBe(false);
    });
  });

  describe('ready messages', () => {
    it('should detect Claude Code ready message', () => {
      expect(isSystemMessage("I'm ready to help! I'm Claude Code, Anthropic's official CLI for Claude")).toBe(true);
    });

    it('should detect Claude Code ready message with additional text', () => {
      expect(isSystemMessage("I'm ready to help! I'm Claude Code, Anthropic's official CLI for Claude\n\nHow can I assist you today?")).toBe(true);
    });
  });

  describe('normal messages', () => {
    it('should not detect regular user messages', () => {
      expect(isSystemMessage('Hello, how can I help you?')).toBe(false);
    });

    it('should not detect code snippets', () => {
      expect(isSystemMessage('function test() { return true; }')).toBe(false);
    });

    it('should not detect normal conversation', () => {
      expect(isSystemMessage('Let me help you with that task.')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(isSystemMessage('')).toBe(false);
    });

    it('should handle whitespace-only strings', () => {
      expect(isSystemMessage('   ')).toBe(false);
    });

    it('should handle non-string inputs gracefully', () => {
      expect(isSystemMessage(null as unknown as string)).toBe(false);
      expect(isSystemMessage(undefined as unknown as string)).toBe(false);
      expect(isSystemMessage(123 as unknown as string)).toBe(false);
    });
  });
});
