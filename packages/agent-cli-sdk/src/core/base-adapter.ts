/**
 * Base adapter providing shared functionality
 * All concrete adapters should extend this
 */

import type {
  AIAdapter,
  AdapterCapabilities,
  ExecutionOptions,
  ExecutionResponse,
} from '../types';
import { ValidationError } from './errors';
import { writeExecutionLogs } from '../utils/logger';

/**
 * Abstract base class for all adapters
 */
export abstract class BaseAdapter implements AIAdapter {
  protected cliPath: string;
  protected config: Record<string, unknown>;

  constructor(cliPath: string, config: Record<string, unknown> = {}) {
    this.cliPath = cliPath;
    this.config = config;
  }

  // Abstract methods - must be implemented by concrete adapters
  abstract execute<T = string>(
    prompt: string,
    options?: ExecutionOptions
  ): Promise<ExecutionResponse<T>>;

  abstract getCapabilities(): AdapterCapabilities;

  // Shared utility methods

  /**
   * Validate prompt input
   */
  protected validatePrompt(prompt: string): void {
    if (!prompt || typeof prompt !== 'string') {
      throw new ValidationError('Prompt must be a non-empty string');
    }
    if (prompt.trim().length === 0) {
      throw new ValidationError('Prompt cannot be empty');
    }
  }

  /**
   * Validate execution options
   */
  protected validateOptions(options?: ExecutionOptions): void {
    if (!options) return;

    if (
      options.timeout !== undefined &&
      (typeof options.timeout !== 'number' || options.timeout <= 0)
    ) {
      throw new ValidationError('Timeout must be a positive number');
    }

    if (options.onStream && !options.streaming) {
      throw new ValidationError(
        'onStream callback requires streaming to be enabled'
      );
    }

    if (options.responseSchema && typeof options.responseSchema !== 'boolean') {
      if (
        typeof options.responseSchema !== 'object' ||
        typeof options.responseSchema.safeParse !== 'function'
      ) {
        throw new ValidationError(
          'responseSchema must be true or an object with safeParse method'
        );
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  protected generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Start a timer and return a function to get elapsed time
   */
  protected startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Merge configuration with options (options take precedence)
   */
  protected mergeOptions<T extends Record<string, unknown>>(
    options: T
  ): T & Record<string, unknown> {
    return {
      ...this.config,
      ...options,
    };
  }

  /**
   * Get the CLI path
   */
  public getCliPath(): string {
    return this.cliPath;
  }

  /**
   * Get the configuration
   */
  public getConfig(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * Write execution logs safely (non-blocking, errors don't break execution)
   * @param logPath Path to log directory
   * @param input Input data
   * @param output Output data
   * @param error Error if any
   */
  protected async safeWriteLogs(
    logPath: string,
    input: unknown,
    output: unknown,
    error: unknown
  ): Promise<void> {
    try {
      await writeExecutionLogs(
        logPath,
        input as { prompt: string; options: Record<string, unknown> },
        output,
        error
      );
    } catch (logError) {
      // Logging errors never break execution
      console.error('[logger] Failed to write logs:', logError);
    }
  }
}
