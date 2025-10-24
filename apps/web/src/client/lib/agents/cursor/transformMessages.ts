import type { SessionMessage } from '@/shared/types/message.types';

/**
 * Transform Cursor messages (not yet implemented)
 * @throws Error indicating Cursor support is not implemented
 */
export function transformMessages(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _raw: unknown[]
): SessionMessage[] {
  throw new Error('Cursor agent not implemented');
}
