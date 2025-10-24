import type { ContentBlock } from '@/shared/types/message.types';

/**
 * Transform Codex streaming data (not yet implemented)
 * @throws Error indicating Codex support is not implemented
 */
export function transformStreaming(_wsData: unknown): ContentBlock[] {
  throw new Error('Codex agent not implemented');
}
