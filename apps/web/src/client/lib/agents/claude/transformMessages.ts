import type { SessionMessage, ContentBlock } from '@/shared/types/message.types';

/**
 * Transform raw loaded messages to typed SessionMessage format
 * This is already done on the server side, so this is mostly a pass-through
 * with potential client-side cleanup/enhancement
 * @param raw - Raw messages from API
 * @returns Typed SessionMessage array
 */
export function transformMessages(raw: unknown[]): SessionMessage[] {
  return raw.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content as ContentBlock[],
    timestamp: msg.timestamp,
    metadata: msg.metadata,
  }));
}
