/**
 * Claude CLI adapter implementation
 */

import type {
  AdapterCapabilities,
  ExecutionResponse,
  ClaudeConfig,
  ClaudeExecutionOptions,
  SessionOptions,
} from '../../types';
import { BaseAdapter } from '../../core/base-adapter';
import { CLINotFoundError, AuthenticationError, ExecutionError } from '../../core/errors';
import { detectClaudeCLI } from './cli-detector';
import { executeClaudeCLI } from './cli-wrapper';
import { parseStreamOutput } from './parser';
import { ClaudeSession } from './session';

/**
 * Claude CLI adapter implementation
 */
export class ClaudeAdapter extends BaseAdapter {
  constructor(config: ClaudeConfig = {}) {
    // Auto-detect CLI path if not provided
    const resolvedPath = config.cliPath || detectClaudeCLI();

    if (!resolvedPath) {
      throw new CLINotFoundError('claude', 'Claude CLI not found. Install it or set CLAUDE_CLI_PATH');
    }

    super(resolvedPath, config as Record<string, unknown>);
  }

  async execute<T = string>(prompt: string, options: ClaudeExecutionOptions = {}): Promise<ExecutionResponse<T>> {
    // Validate inputs
    this.validatePrompt(prompt);
    this.validateOptions(options);

    // Merge config with options (options take precedence)
    const mergedOptions = this.mergeOptions(options);

    // Set defaults
    if (!mergedOptions.model) {
      mergedOptions.model = 'sonnet';
    }
    if (mergedOptions.dangerouslySkipPermissions === undefined) {
      mergedOptions.dangerouslySkipPermissions = true;
    }

    // Prepare logging
    const inputData = { prompt, options: mergedOptions };
    let response: ExecutionResponse<T> | null = null;
    let executionError: Error | null = null;

    try {
      // Execute CLI
      const result = await executeClaudeCLI(this.cliPath, prompt, mergedOptions as ClaudeExecutionOptions);

      // Parse output
      response = await parseStreamOutput<T>(
        result.stdout,
        result.duration,
        result.exitCode,
        mergedOptions.responseSchema
      );

      // Add stderr
      if (response.raw) {
        response.raw.stderr = result.stderr;
      }
    } catch (error) {
      executionError = error instanceof Error ? error : new Error(String(error));
    } finally {
      // Always log (non-blocking)
      if (mergedOptions.logPath) {
        await this.safeWriteLogs(String(mergedOptions.logPath), inputData, response, executionError);
      }
    }

    // Handle errors
    if (executionError) {
      if (executionError.message.includes('not authenticated')) {
        throw new AuthenticationError('claude');
      }

      throw new ExecutionError(`Claude execution failed: ${executionError.message}`);
    }

    if (!response) {
      throw new ExecutionError('Execution completed but no response generated');
    }

    return response;
  }

  getCapabilities(): AdapterCapabilities {
    return {
      streaming: true,
      sessionManagement: true,
      toolCalling: true,
      multiModal: false, // CLI doesn't support images yet (placeholder for future)
    };
  }

  /**
   * Create a multi-turn conversation session
   */
  createSession(options: SessionOptions = {}): ClaudeSession {
    const mergedOptions = {
      ...this.config,
      ...options,
    };

    return new ClaudeSession(this, mergedOptions);
  }
}
