import type { ContentBlock } from '@/shared/types/message.types';
import type { SessionStreamOutputData } from '@/shared/types/websocket';

/**
 * Transform WebSocket streaming data to ContentBlock array
 * This function extracts content blocks from Claude CLI streaming events
 * @param wsData - WebSocket data from session.{id}.stream_output event
 * @returns Array of content blocks to display
 */
export function transformStreaming(wsData: SessionStreamOutputData): ContentBlock[] {
  if (!wsData?.content?.events) {
    return [];
  }

  const events = wsData.content.events;

  // Claude CLI sends complete messages, not incremental deltas
  // Event types we handle:
  // - { type: "assistant", message: { content: [...] } } - Complete assistant message
  // - { type: "system", ... } - System events (init, etc.) - skip
  // - { type: "result", ... } - Final result - skip

  for (const event of events) {
    // Handle complete assistant message from Claude CLI
    if (event.type === 'assistant' && event.message?.content) {
      // The content is already in the correct ContentBlock[] format
      return event.message.content as ContentBlock[];
    }

    // Ignore system events and result events - they don't contain message content
    if (event.type === 'system' || event.type === 'result') {
      continue;
    }
  }

  return [];
}
