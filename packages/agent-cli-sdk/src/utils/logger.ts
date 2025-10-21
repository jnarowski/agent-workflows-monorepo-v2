/**
 * Execution logging utilities
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ExecutionLog, LogPaths } from '../types';

/**
 * Get log file paths for an execution
 */
export function getLogPaths(baseLogPath: string): LogPaths {
  return {
    base: baseLogPath,
    input: join(baseLogPath, 'input.json'),
    output: join(baseLogPath, 'output.json'),
    error: join(baseLogPath, 'error.json'),
  };
}

/**
 * Write execution logs to disk (non-blocking, never throws)
 */
export async function writeExecutionLogs(
  baseLogPath: string,
  input: { prompt: string; options: Record<string, unknown> },
  output: unknown,
  error: unknown
): Promise<void> {
  try {
    const paths = getLogPaths(baseLogPath);

    // Ensure directory exists
    await mkdir(paths.base, { recursive: true });

    // Prepare log entry
    const log: ExecutionLog = {
      timestamp: Date.now(),
      input,
      output: output as ExecutionLog['output'],
      error: error
        ? {
            message: error instanceof Error ? error.message : JSON.stringify(error),
            stack: error instanceof Error ? error.stack : undefined,
            code:
              error && typeof error === 'object' && 'code' in error
                ? String((error as { code: unknown }).code)
                : undefined,
          }
        : undefined,
    };

    // Write files in parallel
    const writes = [
      writeFile(paths.input, JSON.stringify(input, null, 2), 'utf-8'),
    ];

    if (output) {
      writes.push(
        writeFile(paths.output, JSON.stringify(output, null, 2), 'utf-8')
      );
    }

    if (error) {
      writes.push(
        writeFile(paths.error, JSON.stringify(log.error, null, 2), 'utf-8')
      );
    }

    await Promise.all(writes);
  } catch (logError) {
    // Logging errors are silently ignored
    console.error('[logger] Failed to write execution logs:', logError);
  }
}

/**
 * Create a log path for a session message
 */
export function createSessionMessageLogPath(
  baseSessionLogPath: string,
  messageNumber: number
): string {
  return join(baseSessionLogPath, `message-${messageNumber}`);
}
