import type { ContentBlock } from '@/shared/types/message.types';

/**
 * Transform Cursor streaming data (not yet implemented)
 * @throws Error indicating Cursor support is not implemented
 */
export function transformStreaming(_wsData: unknown): ContentBlock[] {
  throw new Error('Cursor agent not implemented');
}
