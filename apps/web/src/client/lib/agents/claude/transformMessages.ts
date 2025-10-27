import type { SessionMessage } from '@/shared/types/message.types';
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
 * Backend parseFormat already handles the transformation, we just filter and type-cast
 * @param raw - Raw messages from API (already typed by backend)
 * @returns Typed SessionMessage array with system messages filtered out
 */
export function transformMessages(raw: unknown[]): SessionMessage[] {
  // Backend already transformed to correct shape, just need to type-cast and filter
  const messages = raw as SessionMessage[];

  // Filter out system messages
  return messages.filter((message) => !shouldFilterMessage(message));
}
