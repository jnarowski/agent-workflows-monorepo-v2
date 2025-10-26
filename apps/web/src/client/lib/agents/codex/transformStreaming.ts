import type { ContentBlock, ToolInput } from '@/shared/types/message.types';
import type {
  CodexStreamEvent,
  ResponseItemEvent,
  EventMsgEvent,
} from '@repo/agent-cli-sdk';
import {
  isResponseItemEvent,
  isEventMsgEvent,
  isMessagePayload,
  isReasoningPayload,
  isFunctionCallPayload,
  isFunctionCallOutputPayload,
  isAgentReasoningEventPayload,
} from '@repo/agent-cli-sdk';

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
function parseFunctionOutput(outputString: string): string {
  try {
    const parsed = JSON.parse(outputString);
    return parsed.output || outputString;
  } catch {
    return outputString;
  }
}

/**
 * Transform Codex streaming WebSocket events into ContentBlock format
 * Handles real-time events from WebSocket for immediate display
 */
export function transformStreaming(wsData: unknown): ContentBlock[] {
  // Parse the event from WebSocket data
  const event = typeof wsData === 'string' ? JSON.parse(wsData) : wsData;
  const blocks: ContentBlock[] = [];

  // Handle response_item events
  if (isResponseItemEvent(event as CodexStreamEvent)) {
    const { payload } = event as ResponseItemEvent;

    // Handle message payloads (text content)
    if (isMessagePayload(payload)) {
      const textContent = payload.content
        .map((c) => ('text' in c ? c.text : ''))
        .filter((t) => t.length > 0)
        .join('\n');

      if (textContent) {
        blocks.push({
          type: 'text',
          text: textContent,
        });
      }
    }

    // Handle reasoning payloads (thinking blocks)
    else if (isReasoningPayload(payload)) {
      const summaryText = payload.summary
        .map((s) => ('text' in s ? s.text : ''))
        .filter((t) => t.length > 0)
        .join('\n');

      if (summaryText) {
        blocks.push({
          type: 'thinking',
          thinking: summaryText,
        });
      }
    }

    // Handle function call payloads (tool use)
    else if (isFunctionCallPayload(payload)) {
      blocks.push({
        type: 'tool_use',
        id: payload.call_id,
        name: payload.name,
        input: parseFunctionArguments(payload.arguments),
      });
    }

    // Handle function output payloads (tool results)
    else if (isFunctionCallOutputPayload(payload)) {
      blocks.push({
        type: 'tool_result',
        tool_use_id: payload.call_id,
        content: parseFunctionOutput(payload.output),
        is_error: false,
      });
    }
  }

  // Handle event_msg events (real-time streaming updates)
  else if (isEventMsgEvent(event as CodexStreamEvent)) {
    const { payload } = event as EventMsgEvent;

    // Handle agent reasoning events (real-time thinking updates)
    if (isAgentReasoningEventPayload(payload)) {
      blocks.push({
        type: 'thinking',
        thinking: payload.text,
      });
    }
  }

  return blocks;
}
