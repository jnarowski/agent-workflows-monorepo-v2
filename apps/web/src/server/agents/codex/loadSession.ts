import type { SessionMessage } from '@/shared/types/message.types';

/**
 * Load a Codex session (not yet implemented)
 * @throws Error indicating Codex support is not implemented
 */
export async function loadSession(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _sessionId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _projectPath: string
): Promise<SessionMessage[]> {
  throw new Error('Codex agent not implemented');
}
