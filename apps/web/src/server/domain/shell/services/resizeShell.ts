import type * as pty from 'node-pty';

/**
 * Resize a shell session terminal
 * @param ptyProcess - PTY process to resize
 * @param cols - New column count
 * @param rows - New row count
 */
export function resizeShell(ptyProcess: pty.IPty, cols: number, rows: number): void {
  ptyProcess.resize(cols, rows);
}
