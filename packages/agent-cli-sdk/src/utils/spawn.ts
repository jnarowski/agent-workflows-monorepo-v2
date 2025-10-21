/**
 * Cross-platform process spawning utilities
 */

import { spawn } from 'cross-spawn';
import type { SpawnOptions } from 'node:child_process';
import { TimeoutError, ExecutionError } from '../core/errors';

/**
 * Spawn result
 */
export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

/**
 * Spawn options with callbacks
 */
export interface SpawnWithCallbacksOptions {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

/**
 * Spawn a process and collect output
 */
export async function spawnProcess(
  command: string,
  options: SpawnWithCallbacksOptions = {}
): Promise<SpawnResult> {
  const { args = [], cwd, env, timeout, onStdout, onStderr } = options;

  const startTime = Date.now();
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let timeoutHandle: NodeJS.Timeout | undefined;

  const spawnOptions: SpawnOptions = {
    cwd: cwd || process.cwd(),
    env: env ? { ...process.env, ...env } : process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  };

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, spawnOptions);

    if (!child.stdout || !child.stderr) {
      reject(new ExecutionError('Failed to spawn process: no stdio streams'));
      return;
    }

    // Set up timeout
    if (timeout) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');

        // Force kill after 2 seconds if still alive
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 2000);
      }, timeout);
    }

    // Collect stdout
    child.stdout.on('data', (chunk: Buffer) => {
      const str = chunk.toString();
      stdout += str;
      onStdout?.(str);
    });

    // Collect stderr
    child.stderr.on('data', (chunk: Buffer) => {
      const str = chunk.toString();
      stderr += str;
      onStderr?.(str);
    });

    // Handle process exit
    child.on('close', (code: number | null) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      const duration = Date.now() - startTime;

      if (timedOut) {
        reject(
          new TimeoutError(
            timeout!,
            `Process exceeded timeout of ${timeout}ms`
          )
        );
        return;
      }

      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        duration,
      });
    });

    // Handle spawn errors
    child.on('error', (err: Error) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      reject(
        new ExecutionError(`Failed to spawn process: ${err.message}`, undefined, stderr)
      );
    });
  });
}
