import type { ShellSession } from '../types/index.js';

// Module-level sessions Map - shared across all shell service functions
const sessions = new Map<string, ShellSession>();

/**
 * Get an existing shell session
 * @param sessionId - Session ID
 * @returns Shell session or undefined if not found
 */
export function getShellSession(sessionId: string): ShellSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Store a shell session
 * @param sessionId - Session ID
 * @param session - Shell session data
 */
export function setShellSession(sessionId: string, session: ShellSession): void {
  sessions.set(sessionId, session);
}

/**
 * Remove a shell session from the map
 * @param sessionId - Session ID
 */
export function removeShellSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Get session count for monitoring
 */
export function getSessionCount(): number {
  return sessions.size;
}

/**
 * Get all active session IDs for a user
 */
export function getUserSessions(userId: string): string[] {
  const userSessions: string[] = [];
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId) {
      userSessions.push(sessionId);
    }
  }
  return userSessions;
}
