/**
 * Execution logging utilities (simplified)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Write execution logs to disk (non-blocking, never throws)
 */
export async function writeLog(
  baseLogPath: string,
  input: { prompt: string; options: Record<string, unknown> },
  output?: unknown,
  error?: unknown
): Promise<void> {
  try {
    // Ensure directory exists
    await mkdir(baseLogPath, { recursive: true });

    // Prepare error object if needed
    const errorObj = error
      ? {
          message: error instanceof Error ? error.message : JSON.stringify(error),
          stack: error instanceof Error ? error.stack : undefined,
          code:
            error && typeof error === 'object' && 'code' in error
              ? String((error as { code: unknown }).code)
              : undefined,
        }
      : undefined;

    // Write files
    const writes = [
      writeFile(join(baseLogPath, 'input.json'), JSON.stringify(input, null, 2), 'utf-8'),
    ];

    if (output) {
      writes.push(
        writeFile(join(baseLogPath, 'output.json'), JSON.stringify(output, null, 2), 'utf-8')
      );
    }

    if (errorObj) {
      writes.push(
        writeFile(join(baseLogPath, 'error.json'), JSON.stringify(errorObj, null, 2), 'utf-8')
      );
    }

    await Promise.all(writes);
  } catch {
    // Silently ignore logging errors
  }
}
