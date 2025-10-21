/**
 * Claude CLI wrapper for process execution
 */

import type { ClaudeExecutionOptions } from '../../types';
import type { SpawnResult } from '../../utils';
import { spawnProcess } from '../../utils';

/**
 * Build Claude CLI arguments from options
 */
export function buildClaudeArgs(
  prompt: string,
  options: ClaudeExecutionOptions
): string[] {
  const args: string[] = [];

  // Programmatic mode (non-interactive)
  args.push('-p');

  // Model selection
  if (options.model) {
    args.push('--model', options.model);
  }

  // Session management (sessionId, continue, and resume are mutually exclusive)
  if (options.sessionId && options.resume) {
    // Resume an existing session with specific ID
    args.push('--resume', options.sessionId);
  } else if (options.sessionId) {
    // Create new session with specific ID
    args.push('--session-id', options.sessionId);
  } else if (options.continue) {
    args.push('--continue');
  }

  // Permission mode
  if (options.permissionMode) {
    args.push('--permission-mode', options.permissionMode);
  } else if (options.dangerouslySkipPermissions) {
    args.push('--permission-mode', 'acceptEdits');
  }

  // Output format (stream-json requires --verbose)
  const useStreamJson = options.streaming !== false;
  if (useStreamJson) {
    args.push('--output-format', 'stream-json');
    args.push('--verbose'); // Required for stream-json
  } else if (options.verbose) {
    args.push('--verbose');
  }

  // Tool settings
  if (options.toolSettings?.allowedTools) {
    args.push('--allowed-tools', options.toolSettings.allowedTools.join(','));
  }
  if (options.toolSettings?.disallowedTools) {
    args.push(
      '--disallowed-tools',
      options.toolSettings.disallowedTools.join(',')
    );
  }

  // Images
  if (options.images && options.images.length > 0) {
    for (const image of options.images) {
      args.push('-i', image.path);
    }
  }

  // Prompt (must be last)
  args.push(prompt);

  return args;
}

/**
 * Execute Claude CLI
 */
export async function executeClaudeCLI(
  cliPath: string,
  prompt: string,
  options: ClaudeExecutionOptions
): Promise<SpawnResult> {
  const args = buildClaudeArgs(prompt, options);

  // Set up environment
  let env: Record<string, string> | undefined;

  if (options.apiKey || options.oauthToken) {
    const envVars: Record<string, string> = {};
    if (typeof options.apiKey === 'string') {
      envVars['ANTHROPIC_API_KEY'] = options.apiKey;
    }
    if (typeof options.oauthToken === 'string') {
      envVars['CLAUDE_CODE_OAUTH_TOKEN'] = options.oauthToken;
    }
    env = envVars;
  }

  // Set up JSONL parsing and OutputData creation
  let lineBuffer = '';
  let onStdout: ((chunk: string) => void) | undefined;
  let turnStarted = false;
  let accumulatedText = ''; // Track all text accumulated so far

  if (options.onEvent || options.onOutput) {
    onStdout = (chunk: string) => {
      // Parse JSONL events from this chunk
      const chunkEvents: import('../../types').StreamEvent[] = [];
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

          // onEvent handling (if provided)
          if (options.onEvent) {
            // Emit synthetic turn.started event when we see the first assistant message
            if (!turnStarted && event.type === 'assistant') {
              turnStarted = true;
              options.onEvent({
                type: 'turn.started',
                timestamp: event.timestamp || Date.now(),
              });
            }

            // Emit the original event
            options.onEvent(event);

            // Also emit synthetic 'text' and tool events for assistant message content
            // This provides backward compatibility with tests expecting these event types
            if (event.type === 'assistant' && event.message?.content) {
              const content = event.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  // Emit text events
                  if (block.type === 'text' && block.text) {
                    options.onEvent({
                      type: 'text',
                      data: block.text,
                      timestamp: event.timestamp || Date.now(),
                    });
                  }
                  // Emit tool.started events for tool_use blocks
                  if (block.type === 'tool_use' && block.name) {
                    options.onEvent({
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

            // Emit tool.completed for user messages (which contain tool_result blocks)
            if (event.type === 'user' && event.message?.content) {
              const content = event.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'tool_result' && block.tool_use_id) {
                    options.onEvent({
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

            // Emit synthetic turn.completed event when we see the result
            if (event.type === 'result') {
              options.onEvent({
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
      if (options.onOutput) {
        options.onOutput({
          raw: chunk,
          events: chunkEvents.length > 0 ? chunkEvents : undefined,
          text: chunkText || undefined,
          accumulated: accumulatedText,
        });
      }
    };
  }

  return spawnProcess(cliPath, {
    args,
    cwd: options.workingDir,
    env,
    timeout: options.timeout,
    onStdout,
    onStderr: (chunk: string) => {
      if (options.verbose) {
        process.stderr.write(chunk);
      }
    },
  });
}
