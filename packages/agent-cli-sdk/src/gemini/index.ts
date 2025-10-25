/**
 * Gemini CLI Adapter (Stub)
 *
 * This adapter is a placeholder for future Gemini integration.
 * Implementation coming soon.
 */

import type { ExecutionResponse } from '../shared/types';

export interface GeminiConfig {
  cliPath?: string;
  [key: string]: unknown;
}

export interface GeminiOptions {
  workingDir?: string;
  timeout?: number;
  [key: string]: unknown;
}

/**
 * Gemini adapter (not yet implemented)
 */
export class GeminiAdapter {
  public readonly name = 'gemini';

  constructor(_config: GeminiConfig = {}) {
    throw new Error('Gemini adapter is not yet implemented. Stay tuned for future releases!');
  }

  async execute<T = string>(
    _prompt: string,
    _options: GeminiOptions = {}
  ): Promise<ExecutionResponse<T>> {
    throw new Error('Gemini adapter is not yet implemented. Stay tuned for future releases!');
  }
}
