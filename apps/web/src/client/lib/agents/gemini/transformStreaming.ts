import type { ContentBlock } from '@/shared/types/message.types';

/**
 * Transform Gemini streaming data (not yet implemented)
 * @throws Error indicating Gemini support is not implemented
 */
export function transformStreaming(_wsData: unknown): ContentBlock[] {
  throw new Error('Gemini agent not implemented');
}
