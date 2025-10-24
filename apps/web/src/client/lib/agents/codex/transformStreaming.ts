import type { ContentBlock } from '@/shared/types/message.types';

/**
 * Transform Codex streaming data (not yet implemented)
 * @throws Error indicating Codex support is not implemented
 */
export function transformStreaming(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _wsData: unknown
): ContentBlock[] {
  throw new Error('Codex agent not implemented');
}
