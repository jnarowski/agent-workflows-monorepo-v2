/**
 * Parse JSONL session data into ChatMessage array
 * Handles Claude Code CLI output format with streaming events
 */

import type { ChatMessage, ContentBlock, ToolUseBlock, ToolResultBlock } from '../../shared/types/chat';

interface RawStreamEvent {
  type: string;
  timestamp?: number;
  [key: string]: unknown;
}

/**
 * Parse JSONL content into an array of ChatMessage objects
 * Links tool_use blocks with their corresponding tool_result blocks
 *
 * @param jsonlContent - Raw JSONL string content
 * @returns Array of parsed ChatMessage objects
 */
export function parseJSONLSession(jsonlContent: string): ChatMessage[] {
  if (!jsonlContent || jsonlContent.trim() === '') {
    return [];
  }

  const lines = jsonlContent.split('\n').filter(line => line.trim() !== '');
  const messages: ChatMessage[] = [];
  const toolResults = new Map<string, ToolResultBlock>();

  // Track current message being built
  let currentMessage: ChatMessage | null = null;

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as RawStreamEvent;

      // Handle message_start event
      if (event.type === 'message_start') {
        const message = event.message as any;
        currentMessage = {
          id: message?.id || crypto.randomUUID(),
          role: 'assistant',
          content: [],
          timestamp: event.timestamp || Date.now(),
          isStreaming: false
        };
        continue;
      }

      // Handle content_block_start
      if (event.type === 'content_block_start') {
        const block = (event as any).content_block;
        if (!currentMessage) continue;

        if (block.type === 'text') {
          currentMessage.content.push({
            type: 'text',
            text: block.text || ''
          } as ContentBlock);
        } else if (block.type === 'thinking') {
          currentMessage.content.push({
            type: 'thinking',
            thinking: block.thinking || ''
          } as ContentBlock);
        } else if (block.type === 'tool_use') {
          currentMessage.content.push({
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input || {}
          } as ToolUseBlock);
        }
        continue;
      }

      // Handle content_block_delta for streaming content
      if (event.type === 'content_block_delta') {
        if (!currentMessage) continue;
        const delta = (event as any).delta;
        const index = (event as any).index || 0;

        if (delta.type === 'text_delta' && currentMessage.content[index]) {
          const textBlock = currentMessage.content[index] as any;
          if (textBlock.type === 'text') {
            textBlock.text += delta.text || '';
          }
        } else if (delta.type === 'thinking_delta' && currentMessage.content[index]) {
          const thinkingBlock = currentMessage.content[index] as any;
          if (thinkingBlock.type === 'thinking') {
            thinkingBlock.thinking += delta.thinking || '';
          }
        } else if (delta.type === 'input_json_delta' && currentMessage.content[index]) {
          const toolBlock = currentMessage.content[index] as any;
          if (toolBlock.type === 'tool_use') {
            // Accumulate input JSON
            try {
              const partialInput = delta.partial_json || '';
              // We'll parse the complete input when content_block_stop fires
              if (!toolBlock._inputBuffer) toolBlock._inputBuffer = '';
              toolBlock._inputBuffer += partialInput;
            } catch (e) {
              console.warn('Failed to parse tool input delta:', e);
            }
          }
        }
        continue;
      }

      // Handle content_block_stop
      if (event.type === 'content_block_stop') {
        if (!currentMessage) continue;
        const index = (event as any).index || 0;
        const block = currentMessage.content[index] as any;

        // Finalize tool use input parsing
        if (block && block.type === 'tool_use' && block._inputBuffer) {
          try {
            block.input = JSON.parse(block._inputBuffer);
          } catch (e) {
            console.warn('Failed to parse complete tool input:', e);
          }
          delete block._inputBuffer;
        }
        continue;
      }

      // Handle message_stop
      if (event.type === 'message_stop') {
        if (currentMessage) {
          messages.push(currentMessage);
          currentMessage = null;
        }
        continue;
      }

      // Handle user message events
      if (event.type === 'user_message') {
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: [{
            type: 'text',
            text: (event as any).text || (event as any).content || ''
          }],
          timestamp: event.timestamp || Date.now()
        };
        messages.push(userMsg);
        continue;
      }

      // Handle tool_result events (these come separately)
      if (event.type === 'tool_result') {
        const toolResult: ToolResultBlock = {
          type: 'tool_result',
          tool_use_id: (event as any).tool_use_id || '',
          content: (event as any).content || '',
          is_error: (event as any).is_error || false
        };
        toolResults.set(toolResult.tool_use_id, toolResult);
        continue;
      }

    } catch (error) {
      // Skip malformed JSON lines
      console.warn('Failed to parse JSONL line:', error);
      continue;
    }
  }

  // Push any remaining message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  // Link tool results to tool use blocks (not as content blocks, but as metadata for rendering)
  // We don't add tool_result as content blocks in messages, but store them separately
  // The UI components will link them by ID when rendering

  return messages;
}

/**
 * Extract tool results from JSONL and create a lookup map
 * @param jsonlContent - Raw JSONL string content
 * @returns Map of tool_use_id to tool result
 */
export function extractToolResults(jsonlContent: string): Map<string, { content: string; is_error?: boolean }> {
  const toolResults = new Map<string, { content: string; is_error?: boolean }>();

  if (!jsonlContent || jsonlContent.trim() === '') {
    return toolResults;
  }

  const lines = jsonlContent.split('\n').filter(line => line.trim() !== '');

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as RawStreamEvent;

      if (event.type === 'tool_result') {
        const toolUseId = (event as any).tool_use_id || '';
        const content = (event as any).content || '';
        const isError = (event as any).is_error || false;

        toolResults.set(toolUseId, {
          content,
          is_error: isError
        });
      }
    } catch (error) {
      // Skip malformed lines
      continue;
    }
  }

  return toolResults;
}
