import type { SessionMessage } from '@/shared/types/message.types';

/**
 * Load a Codex session (not yet implemented)
 * @throws Error indicating Codex support is not implemented
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function loadSession(
  _sessionId: string,
  _projectPath: string
): Promise<SessionMessage[]> {
  throw new Error('Codex agent not implemented');
}
