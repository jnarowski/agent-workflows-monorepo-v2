import { describe, it, expect } from 'vitest';
import { parseFormat } from './parseFormat';

describe('parseFormat', () => {
  it('should extract usage data as direct property on SessionMessage', () => {
    // Real JSONL line format from Claude CLI with usage data
    const jsonlLine = JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 25,
        cache_read_input_tokens: 10,
      },
      model: 'claude-sonnet-4-5-20250929',
      id: 'msg_123',
      timestamp: '2025-10-26T12:00:00.000Z',
    });

    const result = parseFormat(jsonlLine);

    expect(result).toBeDefined();
    expect(result?.role).toBe('assistant');

    // Usage should be a direct property, not nested in metadata
    expect(result?.usage).toEqual({
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 25,
      cache_read_input_tokens: 10,
    });

    // Usage should NOT be in metadata
    expect(result?.metadata?.usage).toBeUndefined();
  });

  it('should handle messages without usage data', () => {
    const jsonlLine = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      },
      id: 'msg_456',
      timestamp: '2025-10-26T12:00:00.000Z',
    });

    const result = parseFormat(jsonlLine);

    expect(result).toBeDefined();
    expect(result?.role).toBe('user');
    expect(result?.usage).toBeUndefined();
  });

  it('should extract model metadata separately', () => {
    const jsonlLine = JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
      },
      model: 'claude-sonnet-4-5-20250929',
      id: 'msg_789',
      timestamp: '2025-10-26T12:00:00.000Z',
    });

    const result = parseFormat(jsonlLine);

    expect(result).toBeDefined();
    expect(result?.metadata?.model).toBe('claude-sonnet-4-5-20250929');
  });

  it('should extract usage data from message.usage (newer format)', () => {
    // Newer Claude CLI format has usage nested inside message object
    const jsonlLine = JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello from newer format' }],
        usage: {
          input_tokens: 200,
          output_tokens: 100,
          cache_creation_input_tokens: 50,
          cache_read_input_tokens: 25,
        },
      },
      id: 'msg_new_format',
      timestamp: '2025-10-26T12:00:00.000Z',
    });

    const result = parseFormat(jsonlLine);

    expect(result).toBeDefined();
    expect(result?.role).toBe('assistant');

    // Usage should be extracted from message.usage
    expect(result?.usage).toEqual({
      input_tokens: 200,
      output_tokens: 100,
      cache_creation_input_tokens: 50,
      cache_read_input_tokens: 25,
    });
  });
});
