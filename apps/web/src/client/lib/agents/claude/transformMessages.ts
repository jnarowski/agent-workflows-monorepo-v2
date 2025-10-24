import type { SessionMessage, ContentBlock } from '@/shared/types/message.types';

/**
 * Transform raw loaded messages to typed SessionMessage format
 * This is already done on the server side, so this is mostly a pass-through
 * with potential client-side cleanup/enhancement
 * @param raw - Raw messages from API
 * @returns Typed SessionMessage array
 */
export function transformMessages(raw: unknown[]): SessionMessage[] {
  return raw.map((msg: unknown) => {
    const message = msg as Record<string, unknown>;
    return {
      id: message.id as string,
      role: message.role as 'user' | 'assistant',
      content: message.content as ContentBlock[],
      timestamp: message.timestamp as number,
      metadata: message.metadata as Record<string, unknown> | undefined,
    };
  });
}
