import type { SessionMessage } from '@/shared/types/message.types';

/**
 * Transform Codex messages (not yet implemented)
 * @throws Error indicating Codex support is not implemented
 */
export function transformMessages(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _raw: unknown[]
): SessionMessage[] {
  throw new Error('Codex agent not implemented');
}
