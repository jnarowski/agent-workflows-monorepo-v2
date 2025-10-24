import type { SessionMessage, ContentBlock } from '@/shared/types/message.types';
import { isSystemMessage } from '@/shared/utils/message.utils';

/**
 * Checks if a message should be filtered out from display
 * Filters system messages that are internal plumbing (commands, reminders, warmup, etc.)
 * @param message - The message to check
 * @returns true if the message should be filtered (not displayed)
 */
function shouldFilterMessage(message: SessionMessage): boolean {
  // Check if any content block is a text block with system content
  const hasOnlySystemContent = message.content.every((block) => {
    if (block.type === 'text') {
      return isSystemMessage(block.text);
    }
    // Non-text blocks (tool_use, tool_result, thinking) are not system messages
    return false;
  });

  // Filter if ALL content blocks are system messages
  // This preserves messages with mixed content (e.g., user message + tool results)
  return hasOnlySystemContent && message.content.length > 0;
}

/**
 * Transform raw loaded messages to typed SessionMessage format
 * Filters out system messages (commands, reminders, warmup, etc.) from JSONL files
 * @param raw - Raw messages from API
 * @returns Typed SessionMessage array with system messages filtered out
 */
export function transformMessages(raw: unknown[]): SessionMessage[] {
  const messages = raw.map((msg: unknown) => {
    const message = msg as Record<string, unknown>;
    return {
      id: message.id as string,
      role: message.role as 'user' | 'assistant',
      content: message.content as ContentBlock[],
      timestamp: message.timestamp as number,
      metadata: message.metadata as Record<string, unknown> | undefined,
    };
  });

  // Filter out system messages
  return messages.filter((message) => !shouldFilterMessage(message));
}
