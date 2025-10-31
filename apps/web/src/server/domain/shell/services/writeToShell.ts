import type * as pty from 'node-pty';

/**
 * Write data to a shell session
 * @param ptyProcess - PTY process to write to
 * @param data - Data to write
 */
export function writeToShell(ptyProcess: pty.IPty, data: string): void {
  ptyProcess.write(data);
}
