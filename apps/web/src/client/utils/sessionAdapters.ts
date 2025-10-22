/**
 * Simple adapters to transform different JSONL formats into normalized events
 */

import type {
  ChatMessage,
  ClaudeSessionRow,
  ClaudeUserMessageRow,
  ClaudeAssistantMessageRow,
  ContentBlock
} from '../../shared/types/chat';
import { isUserMessage, isAssistantMessage } from '../../shared/types/chat';

/**
 * Normalize a single message object to ensure content is in ContentBlock[] format
 * Handles both raw API messages and pre-normalized messages
 */
export function normalizeMessage(msg: any): ChatMessage {
  let content: string | ContentBlock[];

  // If content is already an array, use it as-is
  if (Array.isArray(msg.content)) {
    content = msg.content;
  }
  // If content is a string, keep it as a string (components handle both formats)
  else if (typeof msg.content === 'string') {
    content = msg.content;
  }
  // Handle message.content from Claude CLI format (nested in message object)
  else if (msg.message?.content) {
    if (typeof msg.message.content === 'string') {
      // Convert string to text block array
      content = [{ type: 'text', text: msg.message.content }];
    } else {
      content = msg.message.content;
    }
  }
  // Fallback to empty string
  else {
    content = '';
  }

  return {
    id: msg.id || msg.uuid || crypto.randomUUID(),
    role: msg.role || msg.type,
    content,
    timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
    isStreaming: false,
  };
}

/**
 * Normalize a JSONL line into a standard event format
 * Returns null if the line should be skipped
 */
type TransformFn = (event: any) => any | null;

/**
 * Transform Claude CLI format to normalized format
 * CLI format: { type: 'user'|'assistant', message: { content: [...] } }
 */
function transformClaudeCliEvent(event: any): any | null {
  // Only process user/assistant messages
  if (!event.type || !['user', 'assistant'].includes(event.type)) {
    return null;
  }

  // Skip messages without content
  if (!event.message?.content) {
    return null;
  }

  // Normalize content to array format
  let content = event.message.content;
  if (typeof content === 'string') {
    // Convert string content to text block array
    content = [{ type: 'text', text: content }];
  } else if (!Array.isArray(content)) {
    return null;
  }

  // Transform to normalized format
  return {
    type: event.type === 'user' ? 'user_message' : 'assistant_message',
    id: event.uuid || crypto.randomUUID(),
    role: event.type,
    content: content, // Normalized to array format
    timestamp: event.timestamp
  };
}

/**
 * Detect which format the JSONL content is in and return appropriate transformer
 */
function detectFormat(jsonlContent: string): TransformFn {
  // Check for Claude CLI format (has type: 'user' or 'assistant')
  if (jsonlContent.includes('"type":"user"') || jsonlContent.includes('"type":"assistant"')) {
    return transformClaudeCliEvent;
  }

  // Default: return events as-is (for streaming format)
  return (event) => event;
}

/**
 * Parse JSONL with automatic format detection
 */
export function parseJSONLWithAdapter(jsonlContent: string): ChatMessage[] {
  if (!jsonlContent?.trim()) return [];

  const transform = detectFormat(jsonlContent);
  const lines = jsonlContent.split('\n').filter(line => line.trim());
  const messages: ChatMessage[] = [];

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as ClaudeSessionRow;
      const normalized = transform(event);

      if (!normalized) continue;

      // Handle user/assistant messages
      if (normalized.type === 'user_message' || normalized.type === 'assistant_message') {
        messages.push({
          id: normalized.id,
          role: normalized.role,
          content: normalized.content,
          timestamp: new Date(normalized.timestamp || Date.now()).getTime(),
          isStreaming: false
        });
      }
    } catch (error) {
      console.warn('Failed to parse JSONL line:', error);
    }
  }

  return messages;
}

/**
 * Extract tool results with automatic format detection
 */
export function extractToolResultsWithAdapter(
  jsonlContent: string
): Map<string, { content: string; is_error?: boolean }> {
  const results = new Map();
  if (!jsonlContent?.trim()) return results;

  const lines = jsonlContent.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as ClaudeSessionRow | any;

      // Check for tool results in user messages (CLI format)
      if (isUserMessage(event) && event.message?.content) {
        const content = Array.isArray(event.message.content)
          ? event.message.content
          : [];

        for (const block of content) {
          if (block.type === 'tool_result' && block.tool_use_id) {
            // Ensure content is a string (could be object for images, etc.)
            const contentStr = typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content, null, 2);

            results.set(block.tool_use_id, {
              content: contentStr || '',
              is_error: block.is_error || false
            });
          }
        }
      }

      // Check for standalone tool_result events (streaming format)
      if (event.type === 'tool_result' && event.tool_use_id) {
        // Ensure content is a string (could be object for images, etc.)
        const content = typeof event.content === 'string'
          ? event.content
          : JSON.stringify(event.content, null, 2);

        results.set(event.tool_use_id, {
          content: content || '',
          is_error: event.is_error || false
        });
      }
    } catch (error) {
      continue;
    }
  }

  return results;
}
