import type { ContentBlock } from '@/shared/types/message.types';

/**
 * Transform Gemini streaming data (not yet implemented)
 * @throws Error indicating Gemini support is not implemented
 */
export function transformStreaming(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _wsData: unknown
): ContentBlock[] {
  throw new Error('Gemini agent not implemented');
}
