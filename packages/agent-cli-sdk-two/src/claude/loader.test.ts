import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { loadClaudeMessages } from './loader';

const REAL_SESSION_PATH = resolve(__dirname, '../../tests/fixtures/claude/sample.jsonl');

describe('loadClaudeMessages', () => {
  it('should load messages from real Claude session file', async () => {
    const messages = await loadClaudeMessages({
      sessionId: REAL_SESSION_PATH,
    });

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]?.tool).toBe('claude');

    // Check that messages are sorted by timestamp
    for (let i = 1; i < messages.length; i++) {
      const currentTimestamp = messages[i]?.timestamp;
      const previousTimestamp = messages[i - 1]?.timestamp;
      if (currentTimestamp !== undefined && previousTimestamp !== undefined) {
        expect(currentTimestamp).toBeGreaterThanOrEqual(previousTimestamp);
      }
    }
  });

  it('should parse all message types correctly', async () => {
    const messages = await loadClaudeMessages({
      sessionId: REAL_SESSION_PATH,
    });

    // Should have both user and assistant messages
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');

    expect(userMessages.length).toBeGreaterThan(0);
    expect(assistantMessages.length).toBeGreaterThan(0);
  });

  it('should preserve native format in messages', async () => {
    const messages = await loadClaudeMessages({
      sessionId: REAL_SESSION_PATH,
    });

    expect(messages[0]?.native).toBeDefined();
    expect(typeof messages[0]?.native).toBe('object');
  });

  it('should return empty array for missing file', async () => {
    const messages = await loadClaudeMessages({
      sessionId: '/nonexistent/file.jsonl',
    });

    expect(messages).toEqual([]);
  });

  it('should handle file path with sessionId', async () => {
    const messages = await loadClaudeMessages({
      sessionId: REAL_SESSION_PATH,
    });

    expect(messages.length).toBeGreaterThan(0);
  });
});
