import * as pty from 'node-pty';
import * as os from 'os';
import { getProjectById } from '@/server/services/project.service';

/**
 * Represents an active shell session
 */
interface ShellSession {
  ptyProcess: pty.IPty;
  projectId: string;
  userId: string;
  createdAt: Date;
}

// Module-level sessions Map
const sessions = new Map<string, ShellSession>();

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `shell_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Detect platform and return appropriate shell configuration
 */
function getShellConfig(): { shell: string; args: string[] } {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: Use PowerShell
    return {
      shell: 'powershell.exe',
      args: ['-NoLogo'],
    };
  } else {
    // Unix-like (macOS, Linux): Use bash
    return {
      shell: process.env.SHELL || 'bash',
      args: ['--login'],
    };
  }
}

/**
 * Create a new shell session
 * @param projectId - Project ID to spawn shell in
 * @param userId - User ID creating the session
 * @param cols - Terminal columns
 * @param rows - Terminal rows
 * @returns Session ID and PTY process
 */
export async function createSession(
  projectId: string,
  userId: string,
  cols: number,
  rows: number
): Promise<{ sessionId: string; ptyProcess: pty.IPty }> {
  // Get project to determine working directory
  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Get platform-specific shell configuration
  const { shell, args } = getShellConfig();

  // Create PTY process
  const ptyProcess = pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: project.path,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '3',
    } as { [key: string]: string },
  });

  // Generate session ID and store session
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    ptyProcess,
    projectId,
    userId,
    createdAt: new Date(),
  });

  return { sessionId, ptyProcess };
}

/**
 * Get an existing shell session
 * @param sessionId - Session ID
 * @returns Shell session or undefined if not found
 */
export function getSession(sessionId: string): ShellSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Destroy a shell session
 * @param sessionId - Session ID
 * @param logger - Optional Fastify logger
 */
export function destroySession(sessionId: string, logger?: FastifyBaseLogger): void {
  const session = sessions.get(sessionId);
  if (session) {
    try {
      session.ptyProcess.kill();
    } catch (error) {
      logger?.error({ err: error, sessionId }, 'Error killing PTY process');
    }
    sessions.delete(sessionId);
  }
}

/**
 * Cleanup all sessions for a specific user
 * @param userId - User ID
 * @param logger - Optional Fastify logger
 */
export function cleanupUserSessions(userId: string, logger?: FastifyBaseLogger): void {
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId) {
      destroySession(sessionId, logger);
    }
  }
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
