/**
 * Example: Using typed events with agent-cli-sdk
 *
 * This example demonstrates how to use type-safe event handling
 * with Claude Code and Codex adapters.
 */

import { Claude } from '../src';
import type {
  ClaudeStreamEvent,
  CodexStreamEvent,
  isAssistantMessageEvent,
  isUserMessageEvent,
  isTurnCompletedEvent,
} from '../src/types';

// Example 1: Type-safe Claude event handling
async function exampleClaudeTypedEvents() {
  const claude = new Claude();

  const response = await claude.execute('What is 2+2?');

  // Cast response.data to ClaudeStreamEvent[] for type safety
  const events = response.data as ClaudeStreamEvent[];

  if (events) {
    for (const event of events) {
      // TypeScript now knows the exact shape of each event type
      if (event.type === 'assistant') {
        // event.data is typed as AssistantMessageData
        console.log('Assistant message:', event.data?.message.content);
      } else if (event.type === 'user') {
        // event.data is typed as UserMessageData
        console.log('User message:', event.data?.message.content);
      } else if (event.type === 'file-history-snapshot') {
        // event.data is typed as FileHistorySnapshotData
        console.log('Snapshot:', event.data?.snapshot.timestamp);
      }
    }
  }

  return response;
}

// Example 2: Using type guards for safer event handling
async function exampleWithTypeGuards() {
  const claude = new Claude();

  const response = await claude.execute('Hello world', {
    onStream: (event) => {
      // Use type guards for runtime type checking
      if (isAssistantMessageEvent(event)) {
        // TypeScript knows this is AssistantMessageEvent
        const content = event.data?.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text') {
              console.log('Text:', block.text);
            } else if (block.type === 'thinking') {
              console.log('Thinking:', block.thinking);
            } else if (block.type === 'tool_use') {
              console.log('Tool:', block.name, block.input);
            }
          }
        }
      } else if (isUserMessageEvent(event)) {
        // TypeScript knows this is UserMessageEvent
        console.log('User UUID:', event.data?.uuid);
      }
    },
  });

  return response;
}

// Example 3: Codex typed events
async function exampleCodexTypedEvents() {
  // Note: Codex adapter would be initialized here
  // const codex = new Codex();

  // For demonstration purposes only
  const mockResponse = {
    output: 'Hello',
    data: [
      {
        type: 'turn.completed',
        data: {
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150,
          },
        },
      },
    ] as CodexStreamEvent[],
    sessionId: 'test',
    status: 'success' as const,
    exitCode: 0,
    duration: 1000,
    metadata: {},
  };

  // Cast to CodexStreamEvent[] for type safety
  const events = mockResponse.data;

  for (const event of events) {
    if (event.type === 'turn.completed') {
      // event.data is typed as TurnCompletedData
      console.log('Usage:', event.data?.usage);
    } else if (event.type === 'item.completed') {
      // event.data is typed as ItemCompletedData
      console.log('Item:', event.data?.item);
    }
  }
}

// Example 4: Extracting specific information from events
async function exampleExtractToolUsage() {
  const claude = new Claude();

  const response = await claude.execute('List files in current directory');
  const events = response.data as ClaudeStreamEvent[];

  // Extract all tool uses
  const toolUses = events
    ?.filter(isAssistantMessageEvent)
    .flatMap((event) => {
      const content = event.data?.message.content;
      if (!Array.isArray(content)) return [];

      return content.filter((block) => block.type === 'tool_use');
    });

  console.log('Tools used:', toolUses?.map((t) => t.name));
}

// Example 5: Handling token usage from Claude events
async function exampleTokenUsage() {
  const claude = new Claude();

  const response = await claude.execute('Explain TypeScript');
  const events = response.data as ClaudeStreamEvent[];

  // Find assistant messages with token usage
  const usageEvents = events
    ?.filter(isAssistantMessageEvent)
    .map((event) => event.data?.message.usage)
    .filter((usage) => usage !== undefined);

  const totalInputTokens = usageEvents?.reduce(
    (sum, usage) => sum + (usage?.input_tokens ?? 0),
    0
  );

  const totalOutputTokens = usageEvents?.reduce(
    (sum, usage) => sum + (usage?.output_tokens ?? 0),
    0
  );

  console.log('Total input tokens:', totalInputTokens);
  console.log('Total output tokens:', totalOutputTokens);
}

export {
  exampleClaudeTypedEvents,
  exampleWithTypeGuards,
  exampleCodexTypedEvents,
  exampleExtractToolUsage,
  exampleTokenUsage,
};
