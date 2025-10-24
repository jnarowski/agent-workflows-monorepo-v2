/**
 * Tests for Claude CLI output parser
 */

import { describe, it, expect } from 'vitest';
import { parseStreamOutput } from '../../../../src/adapters/claude/parser';
import { ParseError } from '../../../../src/core/errors';
import { z } from 'zod';

describe('parseStreamOutput', () => {
  describe('Basic Parsing', () => {
    it('should parse result event', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'Hello, world!', sessionId: 'test-123' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe('Hello, world!');
      expect(response.sessionId).toBe('test-123');
      expect(response.status).toBe('success');
      expect(response.exitCode).toBe(0);
      expect(response.duration).toBe(100);
    });

    it('should extract from assistant message with text content', async () => {
      const stdout = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Response text' }],
        },
        sessionId: 'sess-456',
      });

      const response = await parseStreamOutput(stdout, 200, 0);

      expect(response.data).toBe('Response text');
      expect(response.sessionId).toBe('sess-456');
    });

    it('should handle string content in assistant message', async () => {
      const stdout = JSON.stringify({
        type: 'assistant',
        message: {
          content: 'Direct string content',
        },
        session_id: 'snake-case-id',
      });

      const response = await parseStreamOutput(stdout, 150, 0);

      expect(response.data).toBe('Direct string content');
      expect(response.sessionId).toBe('snake-case-id');
    });

    it('should concatenate multiple text blocks', async () => {
      const events = [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Part 1 ' }] } },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Part 2 ' }] } },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Part 3' }] } },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe('Part 1 Part 2 Part 3');
    });

    it('should fallback to raw stdout if no events found', async () => {
      const stdout = 'Plain text output without JSONL';
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe('Plain text output without JSONL');
    });

    it('should return empty string if no output', async () => {
      const stdout = '';
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe('');
    });
  });

  describe('Session ID Extraction', () => {
    it('should extract camelCase sessionId', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'test', sessionId: 'camel-123' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.sessionId).toBe('camel-123');
    });

    it('should extract snake_case session_id', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'test', session_id: 'snake-456' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.sessionId).toBe('snake-456');
    });

    it('should update session ID from subsequent events', async () => {
      const events = [
        { type: 'start', sessionId: 'first-id' },
        { type: 'result', result: 'output', sessionId: 'second-id' },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      // Parser updates with each event, so last one wins
      expect(response.sessionId).toBe('second-id');
    });

    it('should default to unknown if no session ID', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'test' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.sessionId).toBe('unknown');
    });
  });

  describe('Tool Tracking', () => {
    it('should extract tool names from tool.started events', async () => {
      const events = [
        { type: 'tool.started', toolName: 'Read', timestamp: Date.now() },
        { type: 'tool.completed', toolName: 'Read' },
        { type: 'result', result: 'done' },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.metadata?.toolsUsed).toEqual(['Read']);
      expect(response.actions).toHaveLength(1);
      expect(response.actions?.[0].type).toBe('tool');
      expect(response.actions?.[0].description).toBe('Tool: Read');
    });

    it('should track multiple unique tools', async () => {
      const events = [
        { type: 'tool.started', toolName: 'Read' },
        { type: 'tool.started', toolName: 'Write' },
        { type: 'tool.started', toolName: 'Bash' },
        { type: 'result', result: 'done' },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.metadata?.toolsUsed).toEqual(['Read', 'Write', 'Bash']);
    });

    it('should not duplicate tool names', async () => {
      const events = [
        { type: 'tool.started', toolName: 'Read' },
        { type: 'tool.started', toolName: 'Read' },
        { type: 'tool.started', toolName: 'Write' },
        { type: 'tool.started', toolName: 'Read' },
        { type: 'result', result: 'done' },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.metadata?.toolsUsed).toEqual(['Read', 'Write']);
    });

    it('should handle missing toolsUsed gracefully', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'test' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.metadata?.toolsUsed).toBeUndefined();
    });
  });

  describe('File Modification Tracking', () => {
    it('should extract file paths from file.modified events', async () => {
      const events = [
        { type: 'file.modified', path: '/path/to/file1.ts' },
        { type: 'file.modified', path: '/path/to/file2.ts' },
        { type: 'result', result: 'done' },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.metadata?.filesModified).toEqual(['/path/to/file1.ts', '/path/to/file2.ts']);
    });

    it('should not duplicate file paths', async () => {
      const events = [
        { type: 'file.modified', path: '/file.ts' },
        { type: 'file.modified', path: '/other.ts' },
        { type: 'file.modified', path: '/file.ts' },
        { type: 'result', result: 'done' },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.metadata?.filesModified).toEqual(['/file.ts', '/other.ts']);
    });
  });

  describe('Token Usage', () => {
    it('should extract token usage from assistant message', async () => {
      const stdout = JSON.stringify({
        type: 'assistant',
        message: {
          content: 'Response',
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
          model: 'claude-3-opus',
        },
        sessionId: 'test',
      });

      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
    });

    it('should extract token usage from result event', async () => {
      const stdout = JSON.stringify({
        type: 'result',
        result: 'Output',
        usage: {
          input_tokens: 200,
          output_tokens: 100,
        },
      });

      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.usage).toEqual({
        inputTokens: 200,
        outputTokens: 100,
        totalTokens: 300,
      });
    });

    it('should accumulate token usage across multiple events', async () => {
      const events = [
        {
          type: 'assistant',
          message: {
            content: 'Part 1',
            usage: { input_tokens: 50, output_tokens: 25 },
          },
        },
        {
          type: 'assistant',
          message: {
            content: 'Part 2',
            usage: { input_tokens: 30, output_tokens: 20 },
          },
        },
        {
          type: 'result',
          result: 'Done',
          usage: { input_tokens: 20, output_tokens: 10 },
        },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 55,
        totalTokens: 155,
      });
    });

    it('should be undefined if no usage data', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'test' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.usage).toBeUndefined();
    });
  });

  describe('Model Usage Tracking', () => {
    it('should track usage by model', async () => {
      const stdout = JSON.stringify({
        type: 'assistant',
        message: {
          content: 'Response',
          usage: { input_tokens: 100, output_tokens: 50 },
          model: 'claude-3-opus-20240229',
        },
      });

      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.modelUsage).toBeDefined();
      expect(response.modelUsage?.['claude-3-opus-20240229']).toEqual({
        model: 'claude-3-opus-20240229',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
    });

    it('should accumulate usage for same model', async () => {
      const events = [
        {
          type: 'assistant',
          message: {
            content: 'Part 1',
            usage: { input_tokens: 50, output_tokens: 25 },
            model: 'claude-3-haiku',
          },
        },
        {
          type: 'assistant',
          message: {
            content: 'Part 2',
            usage: { input_tokens: 30, output_tokens: 20 },
            model: 'claude-3-haiku',
          },
        },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.modelUsage?.['claude-3-haiku']).toEqual({
        model: 'claude-3-haiku',
        inputTokens: 80,
        outputTokens: 45,
        totalTokens: 125,
      });
    });

    it('should track multiple models separately', async () => {
      const events = [
        {
          type: 'assistant',
          message: {
            content: 'Opus',
            usage: { input_tokens: 100, output_tokens: 50 },
            model: 'claude-3-opus',
          },
        },
        {
          type: 'assistant',
          message: {
            content: 'Haiku',
            usage: { input_tokens: 20, output_tokens: 10 },
            model: 'claude-3-haiku',
          },
        },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.modelUsage?.['claude-3-opus']).toBeDefined();
      expect(response.modelUsage?.['claude-3-haiku']).toBeDefined();
      expect(response.modelUsage?.['claude-3-opus'].totalTokens).toBe(150);
      expect(response.modelUsage?.['claude-3-haiku'].totalTokens).toBe(30);
    });
  });

  describe('Status and Exit Code', () => {
    it('should set status to success for exit code 0', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'done' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.status).toBe('success');
      expect(response.exitCode).toBe(0);
    });

    it('should set status to error for non-zero exit code', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'failed' });
      const response = await parseStreamOutput(stdout, 100, 1);

      expect(response.status).toBe('error');
      expect(response.exitCode).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should extract error from error event', async () => {
      const events = [
        {
          type: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
          details: { field: 'prompt' },
        },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 1);

      expect(response.status).toBe('error');
      expect(response.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input provided',
        details: { field: 'prompt' },
      });
    });

    it('should extract error from execution_error event', async () => {
      const events = [
        {
          type: 'execution_error',
          code: 'TIMEOUT',
          message: 'Request timed out',
        },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 1);

      expect(response.error).toEqual({
        code: 'TIMEOUT',
        message: 'Request timed out',
        details: undefined,
      });
    });

    it('should create NO_OUTPUT error if no output and no error event', async () => {
      const stdout = '';
      const response = await parseStreamOutput(stdout, 100, 1);

      expect(response.error).toEqual({
        code: 'NO_OUTPUT',
        message: 'CLI exited with code 1 and produced no output',
      });
    });

    it('should use output as error message if no error event', async () => {
      const stdout = 'Some error output';
      const response = await parseStreamOutput(stdout, 100, 1);

      expect(response.error).toEqual({
        code: 'EXECUTION_FAILED',
        message: 'Some error output',
      });
    });
  });

  describe('Structured Output (JSON)', () => {
    it('should parse JSON with responseSchema: true', async () => {
      const stdout = JSON.stringify({
        type: 'result',
        result: '```json\n{"name": "test", "value": 42}\n```',
      });

      const response = await parseStreamOutput(stdout, 100, 0, true);

      expect(response.data).toEqual({ name: 'test', value: 42 });
    });

    it('should validate with Zod schema', async () => {
      const UserSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const stdout = JSON.stringify({
        type: 'result',
        result: '{"name": "Alice", "age": 30}',
      });

      const response = await parseStreamOutput(stdout, 100, 0, UserSchema);

      expect(response.data).toEqual({ name: 'Alice', age: 30 });
    });

    it('should throw ParseError for invalid JSON', async () => {
      const stdout = JSON.stringify({
        type: 'result',
        result: 'Not valid JSON at all',
      });

      await expect(parseStreamOutput(stdout, 100, 0, true)).rejects.toThrow(ParseError);
    });

    it('should throw ParseError for schema validation failure', async () => {
      const StrictSchema = z.object({
        required: z.string(),
      });

      const stdout = JSON.stringify({
        type: 'result',
        result: '{"wrong": "field"}',
      });

      await expect(parseStreamOutput(stdout, 100, 0, StrictSchema)).rejects.toThrow(ParseError);
    });

    it('should extract JSON from code block', async () => {
      const jsonInMarkdown = '```json\n{"status": "ok", "count": 5}\n```';
      const stdout = JSON.stringify({ type: 'result', result: jsonInMarkdown });

      const response = await parseStreamOutput(stdout, 100, 0, true);

      expect(response.data).toEqual({ status: 'ok', count: 5 });
    });
  });

  describe('Raw Output', () => {
    it('should include raw stdout', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'test' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.raw?.stdout).toBe(stdout);
    });

    it('should include parsed events', async () => {
      const event1 = { type: 'start', sessionId: 'test' };
      const event2 = { type: 'result', result: 'done' };
      const stdout = `${JSON.stringify(event1)}\n${JSON.stringify(event2)}`;

      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.events).toHaveLength(2);
      expect(response.events?.[0].type).toBe('start');
      expect(response.events?.[1].type).toBe('result');
    });

    it('should set stderr to empty string', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'test' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.raw?.stderr).toBe('');
    });
  });

  describe('Legacy Event Formats', () => {
    it('should handle message.chunk events', async () => {
      const events = [
        { type: 'message.chunk', content: 'Chunk 1 ' },
        { type: 'message.chunk', content: 'Chunk 2' },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe('Chunk 1 Chunk 2');
    });

    it('should handle turn.completed events', async () => {
      const stdout = JSON.stringify({
        type: 'turn.completed',
        message: 'Turn complete message',
      });

      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe('Turn complete message');
    });

    it('should prefer result over turn.completed', async () => {
      const events = [
        { type: 'turn.completed', message: 'Turn message' },
        { type: 'result', result: 'Final result' },
      ];

      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe('Final result');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty JSONL', async () => {
      const stdout = '\n\n\n';
      const response = await parseStreamOutput(stdout, 100, 0);

      // Falls back to raw stdout if no events
      expect(response.data).toBe(stdout);
    });

    it('should handle malformed JSONL gracefully', async () => {
      const stdout = '{invalid json}\n{"type": "result", "result": "valid"}\n{also invalid}';
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe('valid');
    });

    it('should handle mixed valid and invalid JSON lines', async () => {
      const lines = [
        '{"type": "start"}',
        'not json',
        '{"type": "result", "result": "output"}',
        '{incomplete',
      ];

      const stdout = lines.join('\n');
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe('output');
      expect(response.events).toHaveLength(2);
    });

    it('should handle zero duration', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'fast' });
      const response = await parseStreamOutput(stdout, 0, 0);

      expect(response.duration).toBe(0);
    });

    it('should handle very large output', async () => {
      const largeResult = 'x'.repeat(100000);
      const stdout = JSON.stringify({ type: 'result', result: largeResult });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe(largeResult);
      expect(response.data.length).toBe(100000);
    });

    it('should handle special characters in output', async () => {
      const specialChars = 'Special chars: \n\t\r"\'\\';
      const stdout = JSON.stringify({ type: 'result', result: specialChars });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.data).toBe(specialChars);
    });
  });

  describe('Metadata', () => {
    it('should not include empty metadata fields', async () => {
      const stdout = JSON.stringify({ type: 'result', result: 'test' });
      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.metadata?.toolsUsed).toBeUndefined();
      expect(response.metadata?.filesModified).toBeUndefined();
      expect(response.metadata?.tokensUsed).toBeUndefined();
    });

    it('should include tokensUsed if usage data exists', async () => {
      const stdout = JSON.stringify({
        type: 'result',
        result: 'test',
        usage: { input_tokens: 50, output_tokens: 25 },
      });

      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.metadata?.tokensUsed).toBe(75);
    });

    it('should not include tokensUsed if zero', async () => {
      const stdout = JSON.stringify({
        type: 'result',
        result: 'test',
        usage: { input_tokens: 0, output_tokens: 0 },
      });

      const response = await parseStreamOutput(stdout, 100, 0);

      expect(response.metadata?.tokensUsed).toBeUndefined();
    });
  });
});
