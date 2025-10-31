// Shell domain types
import type * as pty from 'node-pty';

export interface ShellSession {
  ptyProcess: pty.IPty;
  projectId: string;
  userId: string;
  createdAt: Date;
}
