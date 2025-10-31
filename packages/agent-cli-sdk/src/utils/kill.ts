import type { ChildProcess } from 'node:child_process';

/**
 * Options for killing a process
 */
export interface KillProcessOptions {
  /**
   * Maximum time in milliseconds to wait for graceful shutdown before force killing
   * @default 5000
   */
  timeoutMs?: number;
}

/**
 * Result of attempting to kill a process
 */
export interface KillProcessResult {
  /**
   * Whether the process was killed (false if already dead)
   */
  killed: boolean;

  /**
   * Signal used to kill the process (SIGTERM or SIGKILL)
   */
  signal?: string;
}

/**
 * Kill a child process with graceful shutdown (SIGTERM → SIGKILL)
 *
 * First attempts graceful shutdown with SIGTERM. If the process doesn't exit
 * within the timeout, sends SIGKILL to force termination.
 *
 * @param process - The child process to kill
 * @param options - Kill options (timeout, etc.)
 * @returns Promise that resolves with kill result
 *
 * @example
 * ```typescript
 * const proc = spawn('claude', ['--help']);
 * const result = await killProcess(proc, { timeoutMs: 5000 });
 * console.log(result); // { killed: true, signal: 'SIGTERM' }
 * ```
 */
export async function killProcess(
  process: ChildProcess,
  options: KillProcessOptions = {}
): Promise<KillProcessResult> {
  const { timeoutMs = 5000 } = options;

  // Check if process is already dead
  if (!process.pid || process.exitCode !== null || process.killed) {
    return { killed: false };
  }

  return new Promise((resolve) => {
    let killTimeout: NodeJS.Timeout | undefined;
    let resolved = false;

    // Handler for process exit
    const onExit = (signal: string) => {
      if (resolved) return;
      resolved = true;

      if (killTimeout) {
        clearTimeout(killTimeout);
      }

      process.removeListener('exit', onExit);
      resolve({ killed: true, signal });
    };

    // Listen for process exit
    process.once('exit', () => onExit('SIGTERM'));

    // Send SIGTERM for graceful shutdown
    try {
      process.kill('SIGTERM');
    } catch (error) {
      // Process might already be dead
      if (resolved) return;
      resolved = true;
      resolve({ killed: false });
      return;
    }

    // Set timeout for force kill
    killTimeout = setTimeout(() => {
      if (resolved) return;

      // Force kill with SIGKILL
      try {
        process.kill('SIGKILL');
        process.once('exit', () => onExit('SIGKILL'));
      } catch (error) {
        // Process died between timeout and kill
        if (!resolved) {
          resolved = true;
          resolve({ killed: true, signal: 'SIGTERM' });
        }
      }
    }, timeoutMs);
  });
}
