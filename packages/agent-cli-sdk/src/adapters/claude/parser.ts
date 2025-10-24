/**
 * Claude CLI output parser
 */

import type {
  ExecutionResponse,
  StreamEvent,
  TokenUsage,
  ModelUsage,
} from '../../types';
import { parseJSONL, extractJSON, safeJSONParse } from '../../utils';
import { ParseError } from '../../core/errors';

/**
 * Parse Claude stream output into ExecutionResponse
 */
export async function parseStreamOutput<T = string>(
  stdout: string,
  duration: number,
  exitCode: number,
  responseSchema?: true | { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { message: string } } }
): Promise<ExecutionResponse<T>> {
  // Parse JSONL events
  const events = parseJSONL(stdout) as StreamEvent[];

  // Extract final output from last text event or execution_complete event
  let output: T;
  let sessionId = 'unknown';
  const actions: ExecutionResponse['actions'] = [];
  const toolsUsed: string[] = [];
  const filesModified: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const modelUsageMap = new Map<string, ModelUsage>();
  let finalOutput = '';

  for (const event of events) {
    const ev = event as unknown as Record<string, unknown>; // Events are raw parsed JSON

    // Track session ID (check both camelCase and snake_case)
    if (ev.sessionId || ev.session_id) {
      sessionId = String(ev.sessionId || ev.session_id);
    }

    // Extract final result message (this is the key output from Claude CLI)
    if (event.type === 'result' && ev.result) {
      finalOutput = typeof ev.result === 'string' ? ev.result : JSON.stringify(ev.result);
    }

    // Extract message content from assistant messages
    if (event.type === 'assistant' && ev.message && typeof ev.message === 'object') {
      const message = ev.message as Record<string, unknown>;
      const content = message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            finalOutput += String(block.text);
          }
        }
      } else if (typeof content === 'string') {
        finalOutput += content;
      }
    }

    // Legacy: Extract message chunks
    if (event.type === 'message.chunk' && ev.content) {
      finalOutput += typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content);
    }
    if (event.type === 'turn.completed' && ev.message) {
      finalOutput = typeof ev.message === 'string' ? ev.message : JSON.stringify(ev.message);
    }

    // Track tool usage
    if (event.type === 'tool.started' && ev.toolName && typeof ev.toolName === 'string') {
      const toolName = ev.toolName;
      if (!toolsUsed.includes(toolName)) {
        toolsUsed.push(toolName);
      }
      actions.push({
        type: 'tool',
        timestamp: event.timestamp || Date.now(),
        description: `Tool: ${toolName}`,
        metadata: ev,
      });
    }

    // Track file modifications
    if (event.type === 'file.modified' && ev.path && typeof ev.path === 'string') {
      const filePath = ev.path;
      if (!filesModified.includes(filePath)) {
        filesModified.push(filePath);
      }
    }

    // Track token usage from assistant message or result event
    if (event.type === 'assistant' && ev.message && typeof ev.message === 'object') {
      const message = ev.message as Record<string, unknown>;
      if (message.usage && typeof message.usage === 'object') {
        const usage = message.usage as Record<string, unknown>;
        const model = (typeof message.model === 'string' ? message.model : 'unknown');
        const inputTokens = Number(usage.input_tokens) || 0;
        const outputTokens = Number(usage.output_tokens) || 0;

        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;

        const existing = modelUsageMap.get(model);
        if (existing) {
          existing.inputTokens += inputTokens;
          existing.outputTokens += outputTokens;
          existing.totalTokens += inputTokens + outputTokens;
        } else {
          modelUsageMap.set(model, {
            model,
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
          });
        }
      }
    } else if (event.type === 'result' && ev.usage && typeof ev.usage === 'object') {
      const usage = ev.usage as Record<string, unknown>;
      const inputTokens = Number(usage.input_tokens) || 0;
      const outputTokens = Number(usage.output_tokens) || 0;

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
    }
  }

  // If no JSONL events were found and finalOutput is empty, use the original output as fallback
  if (!finalOutput && stdout) {
    finalOutput = stdout;
  }

  if (!finalOutput) {
    output = '' as T;
  } else if (responseSchema) {
    // Parse structured output
    try {
      if (responseSchema === true) {
        output = extractJSON(finalOutput) as T;
      } else {
        output = safeJSONParse(finalOutput, responseSchema as { safeParse: (data: unknown) => { success: boolean; data?: T } });
      }
    } catch (err) {
      throw new ParseError(
        `Failed to parse structured output: ${err instanceof Error ? err.message : String(err)}`,
        finalOutput
      );
    }
  } else {
    output = finalOutput as T;
  }

  // Build usage object
  const usage: TokenUsage | undefined =
    totalInputTokens > 0 || totalOutputTokens > 0
      ? {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
        }
      : undefined;

  const modelUsage: Record<string, ModelUsage> | undefined =
    modelUsageMap.size > 0
      ? Object.fromEntries(modelUsageMap.entries())
      : undefined;

  // Determine status
  const status: ExecutionResponse['status'] =
    exitCode === 0 ? 'success' : 'error';

  // Extract error information if execution failed
  let error: ExecutionResponse['error'];
  if (status === 'error') {
    // Look for error events
    const errorEvent = events.find((e: StreamEvent) =>
      e.type === 'error' || e.type === 'execution_error'
    );

    if (errorEvent) {
      const ev = errorEvent as unknown as Record<string, unknown>;
      const code = typeof ev.code === 'string' ? ev.code : 'EXECUTION_ERROR';
      const message = typeof ev.message === 'string' ? ev.message : 'Execution failed';
      error = {
        code,
        message,
        details: ev.details && typeof ev.details === 'object' ? ev.details as Record<string, unknown> : undefined,
      };
    } else if (!output || String(output).trim().length === 0) {
      // No output and no error event - generic error
      error = {
        code: 'NO_OUTPUT',
        message: `CLI exited with code ${exitCode} and produced no output`,
      };
    } else {
      // Has output but failed - use output as error message
      error = {
        code: 'EXECUTION_FAILED',
        message: String(output),
      };
    }
  }

  return {
    data: output,
    events: events.length > 0 ? events : undefined,
    sessionId,
    status,
    exitCode,
    duration,
    actions: actions.length > 0 ? actions : undefined,
    metadata: {
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
      filesModified: filesModified.length > 0 ? filesModified : undefined,
      tokensUsed: totalInputTokens + totalOutputTokens || undefined,
    },
    usage,
    modelUsage,
    raw: {
      stdout,
      stderr: '',
    },
    error,
  };
}
