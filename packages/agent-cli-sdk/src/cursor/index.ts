/**
 * Cursor CLI Adapter (Stub)
 *
 * This adapter is a placeholder for future Cursor integration.
 * Implementation coming soon.
 */

import type { ExecutionResponse } from '../shared/types';

export interface CursorConfig {
  cliPath?: string;
  [key: string]: unknown;
}

export interface CursorOptions {
  workingDir?: string;
  timeout?: number;
  [key: string]: unknown;
}

/**
 * Cursor adapter (not yet implemented)
 */
export class CursorAdapter {
  public readonly name = 'cursor';

  constructor(_config: CursorConfig = {}) {
    throw new Error('Cursor adapter is not yet implemented. Stay tuned for future releases!');
  }

  async execute<T = string>(
    _prompt: string,
    _options: CursorOptions = {}
  ): Promise<ExecutionResponse<T>> {
    throw new Error('Cursor adapter is not yet implemented. Stay tuned for future releases!');
  }
}
