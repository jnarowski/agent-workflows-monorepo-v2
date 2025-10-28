import type { UnifiedMessage, UnifiedContent } from '../types/unified';
import type { ClaudeEvent, ContentBlock } from './types';

// ============================================================================
// Public API
// ============================================================================

export function parser(jsonlLine: string): UnifiedMessage | null {
  try {
    const event: ClaudeEvent = JSON.parse(jsonlLine);

    if (event.type !== 'user' && event.type !== 'assistant') {
      return null;
    }

    const message = event.message;
    if (!message) {
      return null;
    }

    const rawContent = message.content;
    const content: ContentBlock[] = typeof rawContent === 'string'
      ? [{ type: 'text', text: rawContent }]
      : rawContent;

    const unifiedContent: UnifiedContent[] = content.map(block => {
      if (block.type === 'text') {
        return {
          type: 'text',
          text: block.text || '',
        };
      }

      if (block.type === 'thinking') {
        return {
          type: 'thinking',
          thinking: block.thinking || '',
        };
      }

      if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          id: block.id || '',
          name: block.name || '',
          input: block.input || {},
        };
      }

      if (block.type === 'tool_result') {
        return {
          type: 'tool_result',
          tool_use_id: block.tool_use_id || '',
          content: block.content,
          is_error: block.is_error,
        };
      }

      // Fallback for unknown types - shouldn't happen but type-safe
      return {
        type: 'text',
        text: '',
      };
    });

    return {
      id: event.uuid || message.id || `${event.timestamp}-${event.type}`,
      role: message.role,
      content: unifiedContent,
      timestamp: event.timestamp ? new Date(event.timestamp).getTime() : Date.now(),
      tool: 'claude',
      model: message.model,
      usage: message.usage ? {
        inputTokens: message.usage.input_tokens || 0,
        outputTokens: message.usage.output_tokens || 0,
        totalTokens: (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0),
        cacheCreationTokens: message.usage.cache_creation_input_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens,
      } : undefined,
      _original: event,
    };
  } catch {
    return null;
  }
}
