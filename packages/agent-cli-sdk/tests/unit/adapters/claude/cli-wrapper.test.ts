/**
 * Tests for Claude CLI wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeClaudeCLI } from '../../../../src/adapters/claude/cli-wrapper.js';
import type { ClaudeExecutionOptions } from '../../../../src/types/index.js';
import * as spawnModule from '../../../../src/utils/spawn.js';

// Mock the spawn module
vi.mock('../../../../src/utils/spawn.js', () => ({
  spawnProcess: vi.fn(),
}));

describe('executeClaudeCLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text Duplication Prevention', () => {
    it('should not duplicate text when result event contains accumulated output', async () => {
      // This is a regression test for the text duplication bug
      // When Claude streams output, it sends:
      // 1. Multiple assistant events with text content (streaming)
      // 2. A final result event with the full accumulated text
      // We should NOT extract text from the result event as it duplicates the streamed content

      const outputCalls: any[] = [];

      const options: ClaudeExecutionOptions = {
        onOutput: (data) => {
          outputCalls.push({
            text: data.text,
            accumulated: data.accumulated,
            hasEvents: data.events && data.events.length > 0,
          });
        },
      };

      // Simulate streaming chunks
      const chunk1 = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Perfect! Let me start with the first question:\n\n' },
          ],
        },
        sessionId: 'test-session',
      });

      const chunk2 = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: "**What's the purpose of this ecommerce app?**\n\n" },
          ],
        },
        sessionId: 'test-session',
      });

      const chunk3 = JSON.stringify({
        type: 'result',
        result:
          "Perfect! Let me start with the first question:\n\n**What's the purpose of this ecommerce app?**\n\n",
        sessionId: 'test-session',
      });

      // Mock spawnProcess to call onStdout with simulated chunks
      vi.mocked(spawnModule.spawnProcess).mockImplementation(async (_path, opts) => {
        if (opts?.onStdout) {
          // Simulate streaming output
          opts.onStdout(chunk1 + '\n');
          opts.onStdout(chunk2 + '\n');
          opts.onStdout(chunk3 + '\n');
        }

        return {
          stdout: chunk1 + '\n' + chunk2 + '\n' + chunk3 + '\n',
          stderr: '',
          exitCode: 0,
          duration: 100,
        };
      });

      await executeClaudeCLI('/mock/claude', 'test prompt', options);

      // Verify we got 3 onOutput calls
      expect(outputCalls).toHaveLength(3);

      // First chunk: should contain first text
      expect(outputCalls[0].text).toBe(
        'Perfect! Let me start with the first question:\n\n'
      );
      expect(outputCalls[0].accumulated).toBe(
        'Perfect! Let me start with the first question:\n\n'
      );

      // Second chunk: should contain second text
      expect(outputCalls[1].text).toBe(
        "**What's the purpose of this ecommerce app?**\n\n"
      );
      expect(outputCalls[1].accumulated).toBe(
        "Perfect! Let me start with the first question:\n\n**What's the purpose of this ecommerce app?**\n\n"
      );

      // Third chunk (result event): should NOT contain duplicate text
      // This is the key assertion - result events should not add to text
      expect(outputCalls[2].text).toBeUndefined();

      // But accumulated should still be the full text (not doubled)
      expect(outputCalls[2].accumulated).toBe(
        "Perfect! Let me start with the first question:\n\n**What's the purpose of this ecommerce app?**\n\n"
      );

      // Verify the result event was parsed (has events)
      expect(outputCalls[2].hasEvents).toBe(true);
    });

    it('should correctly accumulate text from multiple assistant messages', async () => {
      const outputCalls: any[] = [];

      const options: ClaudeExecutionOptions = {
        onOutput: (data) => {
          outputCalls.push({
            text: data.text,
            accumulated: data.accumulated,
          });
        },
      };

      // Simulate multiple assistant messages
      const chunks = [
        JSON.stringify({
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'First ' }] },
        }),
        JSON.stringify({
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Second ' }] },
        }),
        JSON.stringify({
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Third' }] },
        }),
      ];

      vi.mocked(spawnModule.spawnProcess).mockImplementation(async (_path, opts) => {
        if (opts?.onStdout) {
          for (const chunk of chunks) {
            opts.onStdout(chunk + '\n');
          }
        }

        return {
          stdout: chunks.join('\n'),
          stderr: '',
          exitCode: 0,
          duration: 100,
        };
      });

      await executeClaudeCLI('/mock/claude', 'test', options);

      expect(outputCalls).toHaveLength(3);

      // Each chunk should have incremental text
      expect(outputCalls[0].text).toBe('First ');
      expect(outputCalls[0].accumulated).toBe('First ');

      expect(outputCalls[1].text).toBe('Second ');
      expect(outputCalls[1].accumulated).toBe('First Second ');

      expect(outputCalls[2].text).toBe('Third');
      expect(outputCalls[2].accumulated).toBe('First Second Third');
    });

    it('should handle result event without text duplication in mixed event stream', async () => {
      const outputCalls: any[] = [];

      const options: ClaudeExecutionOptions = {
        onOutput: (data) => {
          outputCalls.push({
            text: data.text,
            accumulated: data.accumulated,
          });
        },
      };

      // Realistic stream with tool use and text
      const chunks = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'text', text: 'Let me help you with that.\n\n' },
              { type: 'tool_use', id: 'tool-1', name: 'Read', input: {} },
            ],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'I found the answer.' }],
          },
        }),
        JSON.stringify({
          type: 'result',
          result: 'Let me help you with that.\n\nI found the answer.',
        }),
      ];

      vi.mocked(spawnModule.spawnProcess).mockImplementation(async (_path, opts) => {
        if (opts?.onStdout) {
          for (const chunk of chunks) {
            opts.onStdout(chunk + '\n');
          }
        }

        return {
          stdout: chunks.join('\n'),
          stderr: '',
          exitCode: 0,
          duration: 100,
        };
      });

      await executeClaudeCLI('/mock/claude', 'test', options);

      expect(outputCalls).toHaveLength(3);

      // First assistant message
      expect(outputCalls[0].text).toBe('Let me help you with that.\n\n');

      // Second assistant message
      expect(outputCalls[1].text).toBe('I found the answer.');

      // Result event should NOT duplicate text
      expect(outputCalls[2].text).toBeUndefined();

      // Final accumulated should match the full output (not doubled)
      expect(outputCalls[2].accumulated).toBe(
        'Let me help you with that.\n\nI found the answer.'
      );
    });
  });

  describe('Event Parsing', () => {
    it('should parse and emit events correctly', async () => {
      const events: any[] = [];

      const options: ClaudeExecutionOptions = {
        onOutput: (data) => {
          if (data.events) {
            events.push(...data.events);
          }
        },
      };

      const chunk = JSON.stringify({
        type: 'assistant',
        message: { content: 'test' },
        sessionId: 'test',
      });

      vi.mocked(spawnModule.spawnProcess).mockImplementation(async (_path, opts) => {
        if (opts?.onStdout) {
          opts.onStdout(chunk + '\n');
        }

        return {
          stdout: chunk,
          stderr: '',
          exitCode: 0,
          duration: 100,
        };
      });

      await executeClaudeCLI('/mock/claude', 'test', options);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('assistant');
    });
  });
});
