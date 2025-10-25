/**
 * Claude CLI Adapter
 */

import type { ExecutionResponse, StreamEvent } from '../shared/types';
import { spawnProcess } from '../shared/spawn';
import { writeLog } from '../shared/logging';
import { ValidationError, CLINotFoundError } from '../shared/errors';
import { detectClaudeCLI } from './cli-detector';
import { buildClaudeArgs } from './cli-args';
import { parseClaudeOutput } from './parser';
import type { ClaudeOptions, ClaudeConfig } from './types';
import type { ClaudeStreamEvent } from './events';

export type { ClaudeOptions, ClaudeConfig, ClaudeStreamEvent };
export * from './events';

/**
 * Lightweight Claude adapter for executing CLI commands
 */
export class ClaudeAdapter {
  private readonly cliPath: string;
  private readonly config: ClaudeConfig;

  /**
   * Create a new Claude adapter
   * @param config - Claude adapter configuration
   */
  constructor(config: ClaudeConfig = {}) {
    // Detect or use provided CLI path
    const detectedPath = config.cliPath || detectClaudeCLI();
    if (!detectedPath) {
      throw new CLINotFoundError('claude', 'Claude CLI not found. Please install Claude Code or set CLAUDE_CLI_PATH environment variable.');
    }

    this.cliPath = detectedPath;
    this.config = config;
  }

  /**
   * Execute a prompt with Claude CLI
   * @template T - Expected output type (inferred from responseSchema)
   * @param prompt - The prompt to execute
   * @param options - Execution options
   * @returns Promise resolving to execution response
   */
  async execute<T = string>(
    prompt: string,
    options: ClaudeOptions = {}
  ): Promise<ExecutionResponse<T>> {
    // Inline prompt validation (4 lines)
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new ValidationError('Prompt must be a non-empty string');
    }

    // Merge constructor config with execute options
    const mergedOptions: ClaudeOptions = {
      ...this.config,
      ...options,
    };

    // Build CLI arguments
    const args = buildClaudeArgs(prompt, mergedOptions);

    // Set up environment
    let env: Record<string, string> | undefined;
    if (mergedOptions.apiKey || mergedOptions.oauthToken) {
      const envVars: Record<string, string> = {};
      if (typeof mergedOptions.apiKey === 'string') {
        envVars['ANTHROPIC_API_KEY'] = mergedOptions.apiKey;
      }
      if (typeof mergedOptions.oauthToken === 'string') {
        envVars['CLAUDE_CODE_OAUTH_TOKEN'] = mergedOptions.oauthToken;
      }
      env = envVars;
    }

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

            // Extract text from assistant messages
            if (event.type === 'assistant' && event.message?.content) {
              const content = event.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text' && block.text) {
                    chunkText += block.text;
                  }
                }
              }
            }

            // onEvent handling
            if (mergedOptions.onEvent) {
              // Emit synthetic turn.started event when we see the first assistant message
              if (!turnStarted && event.type === 'assistant') {
                turnStarted = true;
                mergedOptions.onEvent({
                  type: 'turn.started',
                  timestamp: event.timestamp || Date.now(),
                });
              }

              // Emit the original event
              mergedOptions.onEvent(event);

              // Emit synthetic events for backward compatibility
              if (event.type === 'assistant' && event.message?.content) {
                const content = event.message.content;
                if (Array.isArray(content)) {
                  for (const block of content) {
                    // Emit text events
                    if (block.type === 'text' && block.text) {
                      mergedOptions.onEvent({
                        type: 'text',
                        data: { text: block.text },
                        timestamp: event.timestamp || Date.now(),
                      });
                    }
                    // Emit tool.started events for tool_use blocks
                    if (block.type === 'tool_use' && block.name) {
                      mergedOptions.onEvent({
                        type: 'tool.started',
                        data: {
                          toolName: block.name,
                          name: block.name,
                          id: block.id,
                          input: block.input,
                        },
                        timestamp: event.timestamp || Date.now(),
                      });
                    }
                  }
                }
              }

              // Emit tool.completed for user messages
              if (event.type === 'user' && event.message?.content) {
                const content = event.message.content;
                if (Array.isArray(content)) {
                  for (const block of content) {
                    if (block.type === 'tool_result' && block.tool_use_id) {
                      mergedOptions.onEvent({
                        type: 'tool.completed',
                        data: {
                          toolId: block.tool_use_id,
                          result: block.content,
                          isError: block.is_error || false,
                        },
                        timestamp: event.timestamp || Date.now(),
                      });
                    }
                  }
                }
              }

              // Emit synthetic turn.completed event
              if (event.type === 'result') {
                mergedOptions.onEvent({
                  type: 'turn.completed',
                  timestamp: event.timestamp || Date.now(),
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
      env,
      timeout: mergedOptions.timeout,
      onStdout,
      onStderr: (chunk: string) => {
        if (mergedOptions.verbose) {
          process.stderr.write(chunk);
        }
      },
    });

    // Parse output
    const response = await parseClaudeOutput<T>(
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
