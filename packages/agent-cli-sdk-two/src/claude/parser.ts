import type { UnifiedMessage, UnifiedContent } from '../types/unified';
import type { ClaudeEvent, ContentBlock } from './types';

export function parseClaudeEvent(jsonlLine: string): UnifiedMessage | null {
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
      const unified: UnifiedContent = { type: block.type };
      if (block.text) unified.text = block.text;
      if (block.thinking) unified.thinking = block.thinking;
      if (block.name) unified.toolName = block.name;
      if (block.input) unified.toolInput = block.input;
      if (block.type === 'tool_result') {
        unified.toolResult = block.content;
        unified.isError = block.is_error;
      }
      return unified;
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
      native: event,
    };
  } catch {
    return null;
  }
}
