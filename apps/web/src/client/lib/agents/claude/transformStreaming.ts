import type { ContentBlock } from '@/shared/types/message.types';
import type { SessionStreamOutputData } from '@/shared/types/websocket';

export interface StreamingMessage {
  id: string;
  content: ContentBlock[];
}

/**
 * Transform WebSocket streaming data to message with ID and content
 * This function extracts message ID and content blocks from Claude CLI streaming events
 * @param wsData - WebSocket data from session.{id}.stream_output event
 * @returns Object with message ID and content blocks, or null if no assistant message found
 */
export function transformStreaming(wsData: SessionStreamOutputData): StreamingMessage | null {
  if (!wsData?.content?.events) {
    return null;
  }

  const events = wsData.content.events;

  // Claude CLI sends complete messages, not incremental deltas
  // Event types we handle:
  // - { type: "assistant", message: { id, content: [...] } } - Complete assistant message with unique ID
  // - { type: "system", ... } - System events (init, etc.) - skip
  // - { type: "result", ... } - Final result - skip

  for (const event of events) {
    // Handle complete assistant message from Claude CLI
    if (event.type === 'assistant' && event.message?.content && event.message?.id) {
      // Return both the unique message ID and content blocks
      return {
        id: event.message.id,
        content: event.message.content as ContentBlock[],
      };
    }

    // Ignore system events and result events - they don't contain message content
    if (event.type === 'system' || event.type === 'result') {
      continue;
    }
  }

  return null;
}
