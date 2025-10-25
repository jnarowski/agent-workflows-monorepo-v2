/**
 * Codex CLI Adapter
 */

import type { ExecutionResponse, StreamEvent } from '../shared/types';
import { spawnProcess } from '../shared/spawn';
import { writeLog } from '../shared/logging';
import { ValidationError, CLINotFoundError } from '../shared/errors';
import { detectCodexCLI } from './cli-detector';
import { buildCodexArgs } from './cli-args';
import { parseCodexOutput } from './parser';
import type { CodexOptions, CodexConfig } from './types';
import type { CodexStreamEvent } from './events';

export type { CodexOptions, CodexConfig, CodexStreamEvent };
export * from './events';

/**
 * Lightweight Codex adapter for executing CLI commands
 */
export class CodexAdapter {
  private readonly cliPath: string;
  private readonly config: CodexConfig;

  /**
   * Create a new Codex adapter
   * @param config - Codex adapter configuration
   */
  constructor(config: CodexConfig = {}) {
    // Detect or use provided CLI path
    const detectedPath = config.cliPath || detectCodexCLI();
    if (!detectedPath) {
      throw new CLINotFoundError('codex', 'Codex CLI not found. Please install Codex or set CODEX_CLI_PATH environment variable.');
    }

    this.cliPath = detectedPath;
    this.config = config;
  }

  /**
   * Execute a prompt with Codex CLI
   * @template T - Expected output type (inferred from responseSchema)
   * @param prompt - The prompt to execute
   * @param options - Execution options
   * @returns Promise resolving to execution response
   */
  async execute<T = string>(
    prompt: string,
    options: CodexOptions = {}
  ): Promise<ExecutionResponse<T>> {
    // Inline prompt validation (4 lines)
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new ValidationError('Prompt must be a non-empty string');
    }

    // Merge constructor config with execute options
    const mergedOptions: CodexOptions = {
      ...this.config,
      ...options,
    };

    // Build CLI arguments
    const args = buildCodexArgs(prompt, mergedOptions, mergedOptions.sessionId);

    // Set up JSONL parsing and OutputData creation for streaming
    let lineBuffer = '';
    let onStdout: ((chunk: string) => void) | undefined;
    let turnStarted = false;
    let accumulatedText = '';

    if (mergedOptions.onEvent || mergedOptions.onOutput) {
      onStdout = (chunk: string) => {
        // Parse JSONL events from this chunk
        const chunkEvents: StreamEvent[] = [];
        let chunkText = '';

        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const event = JSON.parse(trimmed);
            chunkEvents.push(event);

            // Extract text from item.completed events with agent_message type
            if (event.type === 'item.completed') {
              const data = event.data as Record<string, unknown>;
              const item = data?.item as Record<string, unknown>;
              if (
                item?.type === 'agent_message' &&
                item?.text &&
                typeof item.text === 'string'
              ) {
                chunkText += item.text;
              }
            }

            // onEvent handling
            if (mergedOptions.onEvent) {
              // Emit synthetic turn.started event when we see the first item
              if (!turnStarted && event.type === 'item.completed') {
                turnStarted = true;
                mergedOptions.onEvent({
                  type: 'turn.started',
                  timestamp: event.timestamp || Date.now(),
                });
              }

              // Emit the original event
              mergedOptions.onEvent(event);

              // Emit synthetic turn.completed event
              if (event.type === 'turn.completed') {
                mergedOptions.onEvent({
                  type: 'turn.completed',
                  timestamp: event.timestamp || Date.now(),
                  data: event.data,
                });
              }
            }
          } catch {
            // Not valid JSON, skip line
          }
        }

        // Update accumulated text
        if (chunkText) {
          accumulatedText += chunkText;
        }

        // Call onOutput with enhanced OutputData
        if (mergedOptions.onOutput) {
          mergedOptions.onOutput({
            raw: chunk,
            events: chunkEvents.length > 0 ? chunkEvents : undefined,
            text: chunkText || undefined,
            accumulated: accumulatedText,
          });
        }
      };
    }

    // Execute CLI
    const result = await spawnProcess(this.cliPath, {
      args,
      cwd: mergedOptions.workingDir,
      timeout: mergedOptions.timeout,
      onStdout,
      onStderr: (chunk: string) => {
        if (mergedOptions.verbose) {
          process.stderr.write(chunk);
        }
      },
    });

    // Parse output
    const response = await parseCodexOutput<T>(
      result.stdout,
      result.duration,
      result.exitCode,
      mergedOptions.responseSchema
    );

    // Optional logging
    if (mergedOptions.logPath) {
      await writeLog(
        mergedOptions.logPath,
        { prompt, options: mergedOptions },
        response,
        response.status === 'error' ? response.error : undefined
      );
    }

    return response;
  }
}
