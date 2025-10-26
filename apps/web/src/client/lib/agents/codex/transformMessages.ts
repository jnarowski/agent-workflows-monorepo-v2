import type { SessionMessage, ToolInput } from '@/shared/types/message.types';
import type {
  CodexStreamEvent,
  FunctionCallPayload,
} from '@repo/agent-cli-sdk';
import {
  isResponseItemEvent,
  isMessagePayload,
  isReasoningPayload,
  isFunctionCallPayload,
  isFunctionCallOutputPayload,
} from '@repo/agent-cli-sdk';

/**
 * Parse JSONL string into Codex events
 */
function parseJSONL(jsonl: string): CodexStreamEvent[] {
  return jsonl
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as CodexStreamEvent);
}

/**
 * Parse function call arguments JSON string
 */
function parseFunctionArguments(argsString: string): ToolInput {
  try {
    return JSON.parse(argsString) as ToolInput;
  } catch {
    return { raw: argsString };
  }
}

/**
 * Parse function output JSON string
 */
function parseFunctionOutput(outputString: string): { output: string; metadata?: unknown } {
  try {
    const parsed = JSON.parse(outputString);
    return parsed as { output: string; metadata?: unknown };
  } catch {
    return { output: outputString };
  }
}

/**
 * Transform Codex JSONL events into SessionMessage format
 * Groups response_item events into messages by role, handling reasoning and function calls
 */
export function transformMessages(raw: unknown[]): SessionMessage[] {
  // If raw is a string (JSONL), parse it
  const rawStr = typeof raw[0] === 'string' ? (raw[0] as string) : JSON.stringify(raw);
  let events: CodexStreamEvent[];

  try {
    // Try parsing as JSONL first
    events = parseJSONL(rawStr);
  } catch {
    // Fallback: assume it's already parsed JSON array
    events = raw as CodexStreamEvent[];
  }

  const messages: SessionMessage[] = [];
  const responseItems = events.filter(isResponseItemEvent);

  let currentMessage: SessionMessage | null = null;
  const functionCallMap = new Map<string, FunctionCallPayload>();

  for (const event of responseItems) {
    const { payload } = event;

    // Handle message payloads (user or agent text)
    if (isMessagePayload(payload)) {
      // Start a new message
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const textContent = payload.content
        .map((c) => ('text' in c ? c.text : ''))
        .filter((t) => t.length > 0)
        .join('\n');

      currentMessage = {
        id: `${messages.length + 1}`,
        role: payload.role === 'agent' ? 'assistant' : 'user',
        content: [{ type: 'text', text: textContent }],
        timestamp: Date.now(),
      };
    }

    // Handle reasoning payloads (thinking blocks)
    else if (isReasoningPayload(payload)) {
      if (!currentMessage || currentMessage.role !== 'assistant') {
        // Start new assistant message if needed
        if (currentMessage) {
          messages.push(currentMessage);
        }
        currentMessage = {
          id: `${messages.length + 1}`,
          role: 'assistant',
          content: [],
          timestamp: Date.now(),
        };
      }

      // Extract summary text from reasoning
      const summaryText = payload.summary
        .map((s) => ('text' in s ? s.text : ''))
        .filter((t) => t.length > 0)
        .join('\n');

      if (summaryText) {
        currentMessage.content.push({
          type: 'thinking',
          thinking: summaryText,
        });
      }
    }

    // Handle function call payloads (tool use)
    else if (isFunctionCallPayload(payload)) {
      if (!currentMessage || currentMessage.role !== 'assistant') {
        // Start new assistant message if needed
        if (currentMessage) {
          messages.push(currentMessage);
        }
        currentMessage = {
          id: `${messages.length + 1}`,
          role: 'assistant',
          content: [],
          timestamp: Date.now(),
        };
      }

      // Store function call for matching with output later
      functionCallMap.set(payload.call_id, payload);

      currentMessage.content.push({
        type: 'tool_use',
        id: payload.call_id,
        name: payload.name,
        input: parseFunctionArguments(payload.arguments),
      });
    }

    // Handle function output payloads (tool results)
    else if (isFunctionCallOutputPayload(payload)) {
      if (!currentMessage || currentMessage.role !== 'assistant') {
        // Start new assistant message if needed
        if (currentMessage) {
          messages.push(currentMessage);
        }
        currentMessage = {
          id: `${messages.length + 1}`,
          role: 'assistant',
          content: [],
          timestamp: Date.now(),
        };
      }

      const parsedOutput = parseFunctionOutput(payload.output);

      currentMessage.content.push({
        type: 'tool_result',
        tool_use_id: payload.call_id,
        content: parsedOutput.output,
        is_error: false,
      });
    }
  }

  // Push last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}
