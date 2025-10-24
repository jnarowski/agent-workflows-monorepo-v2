import type { ContentBlock } from '@/shared/types/message.types';
import type { SessionStreamOutputData } from '@/shared/types/websocket';

/**
 * Transform WebSocket streaming data to ContentBlock array
 * This function extracts content blocks from streaming events
 * @param wsData - WebSocket data from session.{id}.stream_output event
 * @returns Array of content blocks to display
 */
export function transformStreaming(wsData: SessionStreamOutputData): ContentBlock[] {
  console.log('[transformStreaming] Raw wsData:', JSON.stringify(wsData, null, 2));

  if (!wsData?.content?.events) {
    console.log('[transformStreaming] No events in wsData');
    return [];
  }

  const events = wsData.content.events;
  console.log('[transformStreaming] Processing', events.length, 'events');

  // Extract content blocks from events
  // Events can have different shapes:
  // - { type: "content_block_delta", delta: { type: "text", text: "..." } }
  // - { type: "content_block_start", content_block: { type: "tool_use", ... } }
  const contentBlocks: ContentBlock[] = [];

  for (const event of events) {
    console.log('[transformStreaming] Event:', event.type, event);

    // Handle content block deltas (streaming text)
    if (event.type === 'content_block_delta' && event.delta) {
      if (event.delta.type === 'text' && event.delta.text) {
        contentBlocks.push({
          type: 'text',
          text: event.delta.text,
        });
      } else if (event.delta.type === 'thinking' && event.delta.thinking) {
        contentBlocks.push({
          type: 'thinking',
          thinking: event.delta.thinking,
        });
      }
    }

    // Handle content block starts (tool use, etc.)
    if (event.type === 'content_block_start' && event.content_block) {
      const block = event.content_block;
      if (block.type === 'tool_use') {
        contentBlocks.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input || {},
        });
      }
    }

    // Handle tool results (if they come through streaming)
    if (event.type === 'tool_result') {
      contentBlocks.push({
        type: 'tool_result',
        tool_use_id: event.tool_use_id,
        content: event.content,
        is_error: event.is_error,
      });
    }
  }

  console.log('[transformStreaming] Final contentBlocks:', contentBlocks.length, contentBlocks);
  return contentBlocks;
}
