import { useShell } from '../contexts/ShellContext';
import type { TerminalSession } from '../contexts/ShellContext';

/**
 * Convenience hook for accessing a specific terminal session by ID
 * @param sessionId - The ID of the session to access
 * @returns The terminal session or undefined if not found
 */
export function useTerminalSession(sessionId: string): TerminalSession | undefined {
  const { getSession } = useShell();
  return getSession(sessionId);
}
