import type { ContentBlock } from '@/shared/types/message.types';

/**
 * Transform Cursor streaming data (not yet implemented)
 * @throws Error indicating Cursor support is not implemented
 */
export function transformStreaming(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _wsData: unknown
): ContentBlock[] {
  throw new Error('Cursor agent not implemented');
}
