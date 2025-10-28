import { describe, it, expect } from 'vitest';
import { parse } from './parse.js';
import type {
  UnifiedToolUseBlock,
  UnifiedToolResultBlock,
  UnifiedThinkingBlock,
  UnifiedTextBlock,
} from '../types/unified.js';

describe('parse', () => {
  describe('item.completed - reasoning', () => {
    it('should transform reasoning to thinking block', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_0',
          type: 'reasoning',
          text: '**Preparing greeting message**',
        },
      });

      const message = parse(jsonl);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);

      const block = message?.content[0] as UnifiedThinkingBlock;
      expect(block.type).toBe('thinking');
      expect(block.thinking).toBe('**Preparing greeting message**');
    });

    it('should set tool to "codex"', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_0',
          type: 'reasoning',
          text: 'test',
        },
      });

      const message = parse(jsonl);
      expect(message?.tool).toBe('codex');
    });
  });

  describe('item.completed - agent_message', () => {
    it('should transform agent_message to text block', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'agent_message',
          text: 'Hello, world!',
        },
      });

      const message = parse(jsonl);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);

      const block = message?.content[0] as UnifiedTextBlock;
      expect(block.type).toBe('text');
      expect(block.text).toBe('Hello, world!');
    });
  });

  describe('item.completed - command_execution', () => {
    it('should transform command_execution to tool_use and tool_result', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'command_execution',
          command: 'bash -lc ls',
          aggregated_output: 'file1.txt\nfile2.txt\n',
          exit_code: 0,
          status: 'completed',
        },
      });

      const message = parse(jsonl);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(2);

      const toolUse = message?.content[0] as UnifiedToolUseBlock;
      expect(toolUse.type).toBe('tool_use');
      expect(toolUse.name).toBe('Bash');
      expect(toolUse.input).toMatchObject({
        command: 'bash -lc ls',
      });

      const toolResult = message?.content[1] as UnifiedToolResultBlock;
      expect(toolResult.type).toBe('tool_result');
      expect(toolResult.tool_use_id).toBe('item_1');
      expect(toolResult.content).toBe('file1.txt\nfile2.txt\n');
      expect(toolResult.is_error).toBe(false);
    });

    it('should mark tool_result as error when exit_code is non-zero', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'command_execution',
          command: 'bash -lc "exit 1"',
          aggregated_output: 'Error message',
          exit_code: 1,
          status: 'failed',
        },
      });

      const message = parse(jsonl);
      const toolResult = message?.content[1] as UnifiedToolResultBlock;
      expect(toolResult.is_error).toBe(true);
    });
  });

  describe('item.completed - file_change', () => {
    it('should transform file_change add to Write tool_use', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'file_change',
          changes: [
            {
              path: '/path/to/file.txt',
              kind: 'add',
            },
          ],
          status: 'completed',
        },
      });

      const message = parse(jsonl);

      expect(message).not.toBeNull();
      expect(message?.content).toHaveLength(1);

      const block = message?.content[0] as UnifiedToolUseBlock;
      expect(block.type).toBe('tool_use');
      expect(block.name).toBe('Write');
      expect(block.input).toMatchObject({
        file_path: '/path/to/file.txt',
      });
    });

    it('should transform file_change modify to Edit tool_use', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'file_change',
          changes: [
            {
              path: '/path/to/file.txt',
              kind: 'modify',
            },
          ],
          status: 'completed',
        },
      });

      const message = parse(jsonl);
      const block = message?.content[0] as UnifiedToolUseBlock;
      expect(block.name).toBe('Edit');
    });

    it('should transform file_change delete to Bash tool_use', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'file_change',
          changes: [
            {
              path: '/path/to/file.txt',
              kind: 'delete',
            },
          ],
          status: 'completed',
        },
      });

      const message = parse(jsonl);
      const block = message?.content[0] as UnifiedToolUseBlock;
      expect(block.name).toBe('Bash');
      expect(block.input).toMatchObject({
        command: 'rm /path/to/file.txt',
      });
    });

    it('should handle multiple file changes', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'file_change',
          changes: [
            { path: '/file1.txt', kind: 'add' },
            { path: '/file2.txt', kind: 'modify' },
          ],
          status: 'completed',
        },
      });

      const message = parse(jsonl);
      expect(message?.content).toHaveLength(2);
    });
  });

  describe('non-item.completed events', () => {
    it('should return null for thread.started', () => {
      const jsonl = JSON.stringify({
        type: 'thread.started',
        thread_id: '019a2c3d-3ab2-7953-b5b6-a4b07e13f72e',
      });

      const message = parse(jsonl);
      expect(message).toBeNull();
    });

    it('should return null for turn.started', () => {
      const jsonl = JSON.stringify({
        type: 'turn.started',
      });

      const message = parse(jsonl);
      expect(message).toBeNull();
    });

    it('should return null for turn.completed', () => {
      const jsonl = JSON.stringify({
        type: 'turn.completed',
        usage: { input_tokens: 100, output_tokens: 20 },
      });

      const message = parse(jsonl);
      expect(message).toBeNull();
    });

    it('should return null for item.started', () => {
      const jsonl = JSON.stringify({
        type: 'item.started',
        item: { id: 'item_1', type: 'reasoning', text: '' },
      });

      const message = parse(jsonl);
      expect(message).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return null for malformed JSON', () => {
      const jsonl = 'not valid json';
      const message = parse(jsonl);
      expect(message).toBeNull();
    });

    it('should return null for empty string', () => {
      const message = parse('');
      expect(message).toBeNull();
    });
  });

  describe('message metadata', () => {
    it('should use item.id as message id', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'custom_item_id_123',
          type: 'agent_message',
          text: 'test',
        },
      });

      const message = parse(jsonl);
      expect(message?.id).toBe('custom_item_id_123');
    });

    it('should have timestamp', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'agent_message',
          text: 'test',
        },
      });

      const message = parse(jsonl);
      expect(message?.timestamp).toBeGreaterThan(0);
    });

    it('should preserve original event in _original field', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'agent_message',
          text: 'test',
        },
      });

      const message = parse(jsonl);
      expect(message?._original).toBeDefined();
      expect((message?._original as any).type).toBe('item.completed');
    });
  });
});
