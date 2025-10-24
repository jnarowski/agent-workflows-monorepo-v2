import type { SessionMessage } from '@/shared/types/message.types';

/**
 * Transform Gemini messages (not yet implemented)
 * @throws Error indicating Gemini support is not implemented
 */
export function transformMessages(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _raw: unknown[]
): SessionMessage[] {
  throw new Error('Gemini agent not implemented');
}
