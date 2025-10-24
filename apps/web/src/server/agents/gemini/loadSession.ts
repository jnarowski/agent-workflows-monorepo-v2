import type { SessionMessage } from '@/shared/types/message.types';

/**
 * Load a Gemini session (not yet implemented)
 * @throws Error indicating Gemini support is not implemented
 */
export async function loadSession(
  _sessionId: string,
  _projectPath: string
): Promise<SessionMessage[]> {
  throw new Error('Gemini agent not implemented');
}
