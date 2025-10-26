/**
 * Codex CLI output parser
 * Based on Codex CLI v0.46.0 event format
 */

import type { ExecutionResponse, TokenUsage } from '../../utils/types';
import { extractJSON } from '../../utils/json-parser';
import type {
  CodexStreamEvent,
  SessionMetaEvent,
  ResponseItemEvent,
  EventMsgEvent,
  TokenCountEventPayload,
} from './events';
import {
  isSessionMetaEvent,
  isResponseItemEvent,
  isEventMsgEvent,
  isMessagePayload,
  isFunctionCallPayload,
  isTokenCountEventPayload,
} from './events';

/**
 * Parse Codex CLI output
 * Based on Codex CLI 0.46.0 event format
 * @param stdout Raw stdout from CLI
 * @param duration Execution duration in ms
 * @param exitCode CLI exit code
 * @param responseSchema Optional response schema for validation
 * @returns Parsed execution response
 */
export async function parseCodexOutput<T = string>(
  stdout: string,
  duration: number,
  exitCode: number,
  responseSchema?:
    | true
    | { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { message: string } } }
): Promise<ExecutionResponse<T, CodexStreamEvent>> {
  const events = parseStreamEvents(stdout);

  // Extract session ID from session_meta event
  const sessionId = extractSessionId(events);

  // Extract final text output from response_item events with agent messages
  let output: T;
  const agentMessages = extractAgentMessages(events);
  const lastMessage = agentMessages[agentMessages.length - 1];

  if (responseSchema) {
    // Extract and validate JSON
    const jsonResult = extractJSON(
      (typeof lastMessage === 'string' ? lastMessage : '') || stdout
    );
    if (responseSchema === true) {
      output = jsonResult as T;
    } else if (responseSchema.safeParse) {
      const parseResult = responseSchema.safeParse(jsonResult);
      if (!parseResult.success) {
        throw new Error(
          `Response validation failed: ${parseResult.error?.message || 'Unknown validation error'}`
        );
      }
      output = parseResult.data as T;
    } else {
      output = jsonResult as T;
    }
  } else {
    // Plain text output - join all agent messages
    output = (agentMessages.join('\n') || stdout.trim()) as T;
  }

  // Build response
  const response: ExecutionResponse<T, CodexStreamEvent> = {
    data: output,
    events,
    sessionId: sessionId || generateSessionId(),
    status: exitCode === 0 ? 'success' : 'error',
    exitCode,
    duration,
    metadata: {
      toolsUsed: extractToolsUsed(events),
    },
    raw: {
      stdout,
      stderr: '',
    },
  };

  // Add usage information if available
  const usage = extractUsage(events);
  if (usage) {
    response.usage = usage;
  }

  return response;
}

/**
 * Parse JSONL stream events
 * @param output Raw CLI output
 * @returns Array of parsed Codex events
 */
function parseStreamEvents(output: string): CodexStreamEvent[] {
  const lines = output.split('\n').filter((line) => line.trim());
  const events: CodexStreamEvent[] = [];

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as unknown;
      // Type guard to ensure it's a valid Codex event
      if (
        isSessionMetaEvent(event) ||
        isResponseItemEvent(event) ||
        isEventMsgEvent(event) ||
        (typeof event === 'object' &&
          event !== null &&
          'type' in event &&
          event.type === 'turn_context')
      ) {
        events.push(event as CodexStreamEvent);
      }
    } catch {
      // Not a valid JSON line, skip
    }
  }

  return events;
}

/**
 * Extract session ID from session_meta event
 * @param events Stream events
 * @returns Session ID or null
 */
function extractSessionId(events: CodexStreamEvent[]): string | null {
  const sessionMeta = events.find(isSessionMetaEvent) as SessionMetaEvent | undefined;
  return sessionMeta?.payload.id || null;
}

/**
 * Extract agent messages from response_item events
 * @param events Stream events
 * @returns Array of agent message texts
 */
function extractAgentMessages(events: CodexStreamEvent[]): string[] {
  const messages: string[] = [];

  for (const event of events) {
    if (isResponseItemEvent(event)) {
      const payload = event.payload;
      if (isMessagePayload(payload) && payload.role === 'agent') {
        // Extract output_text content from agent messages
        for (const content of payload.content) {
          if (content.type === 'output_text') {
            messages.push(content.text);
          }
        }
      }
    }
  }

  return messages;
}

/**
 * Extract tools used from response_item events with function_call payloads
 * @param events Stream events
 * @returns Array of tool names
 */
function extractToolsUsed(events: CodexStreamEvent[]): string[] {
  const tools = new Set<string>();

  for (const event of events) {
    if (isResponseItemEvent(event)) {
      const payload = event.payload;
      if (isFunctionCallPayload(payload)) {
        tools.add(payload.name);
      }
    }
  }

  return Array.from(tools);
}

/**
 * Extract token usage from event_msg events with token_count payload
 * @param events Stream events
 * @returns Token usage information
 */
function extractUsage(events: CodexStreamEvent[]): TokenUsage | null {
  // Find the last token_count event to get final usage
  let lastTokenCount: TokenCountEventPayload | null = null;

  for (const event of events) {
    if (isEventMsgEvent(event)) {
      const payload = event.payload;
      if (isTokenCountEventPayload(payload) && payload.info) {
        lastTokenCount = payload;
      }
    }
  }

  if (lastTokenCount?.info) {
    const totalUsage = lastTokenCount.info.total_token_usage;
    return {
      inputTokens: totalUsage.input_tokens,
      outputTokens: totalUsage.output_tokens,
      totalTokens: totalUsage.total_tokens,
    };
  }

  return null;
}

/**
 * Generate a session ID
 * @returns Session ID string
 */
function generateSessionId(): string {
  return `codex-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
