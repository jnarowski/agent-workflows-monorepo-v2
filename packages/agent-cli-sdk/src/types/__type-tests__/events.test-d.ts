/**
 * Type tests for event types
 * These tests verify type safety at compile time without executing code.
 *
 * Run with: npm run type-check:tests
 *
 * @fileoverview This file uses @ts-expect-error to test that TypeScript
 * correctly rejects invalid type assignments. Any line with @ts-expect-error
 * SHOULD produce a type error - if it doesn't, the type system isn't working.
 *
 * Note: This file is excluded from the main type-check script to avoid
 * cluttering the output with intentional errors. Use type-check:tests to
 * verify these tests specifically.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  ClaudeStreamEvent,
  CodexStreamEvent,
  BaseStreamEvent,
  FileHistorySnapshotEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  ThreadStartedEvent,
  TurnCompletedEvent,
  ItemCompletedEvent,
  MessageContent,
  TextContent,
  ThinkingContent,
  ToolUseContent,
  ClaudeMessage,
  ExecutionResponse,
} from '../index';

import {
  isClaudeEvent,
  isFileHistorySnapshotEvent,
  isUserMessageEvent,
  isAssistantMessageEvent,
  isCodexEvent,
  isThreadStartedEvent,
  isTurnCompletedEvent,
  isItemCompletedEvent,
} from '../index';

// =============================================================================
// Base Event Type Tests
// =============================================================================

// BaseStreamEvent should accept any type and data
const baseEvent: BaseStreamEvent = {
  type: 'custom',
  timestamp: 123456789,
  data: { foo: 'bar' },
};

// BaseStreamEvent can be generic
const typedBaseEvent: BaseStreamEvent<'test', { value: number }> = {
  type: 'test',
  data: { value: 42 },
};

const wrongTypeEvent: BaseStreamEvent<'test', { value: number }> = {
  // @ts-expect-error - type should match generic parameter
  type: 'wrong',
  data: { value: 42 },
};

// =============================================================================
// Claude Event Type Tests
// =============================================================================

// FileHistorySnapshotEvent should have correct structure
const fileSnapshot: FileHistorySnapshotEvent = {
  type: 'file-history-snapshot',
  data: {
    messageId: 'msg-123',
    snapshot: {
      messageId: 'msg-123',
      trackedFileBackups: {
        'file.ts': {
          backupFileName: 'backup.ts',
          version: 1,
          backupTime: '2024-01-01T00:00:00Z',
        },
      },
      timestamp: '2024-01-01T00:00:00Z',
    },
    isSnapshotUpdate: false,
  },
};

const wrongFileSnapshotType: FileHistorySnapshotEvent = {
  // @ts-expect-error - type must be 'file-history-snapshot'
  type: 'wrong',
  data: fileSnapshot.data,
};

// Optional fields test - data is optional so this is valid
const minimalFileSnapshot2: FileHistorySnapshotEvent = {
  type: 'file-history-snapshot',
};

// UserMessageEvent should have correct structure
const userMessage: UserMessageEvent = {
  type: 'user',
  data: {
    uuid: 'uuid-123',
    timestamp: '2024-01-01T00:00:00Z',
    message: {
      role: 'user',
      content: 'Hello',
    },
  },
};

const wrongUserType: UserMessageEvent = {
  // @ts-expect-error - type must be 'user'
  type: 'assistant',
  data: userMessage.data,
};

// AssistantMessageEvent should have correct structure
const assistantMessage: AssistantMessageEvent = {
  type: 'assistant',
  data: {
    uuid: 'uuid-456',
    timestamp: '2024-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'thinking', thinking: 'Processing...', signature: 'sig' },
      ],
    },
  },
};

const wrongAssistantType: AssistantMessageEvent = {
  // @ts-expect-error - type must be 'assistant'
  type: 'user',
  data: assistantMessage.data,
};

// ClaudeStreamEvent should be a union
const claudeEvent1: ClaudeStreamEvent = fileSnapshot;
const claudeEvent2: ClaudeStreamEvent = userMessage;
const claudeEvent3: ClaudeStreamEvent = assistantMessage;

const wrongClaudeEvent: ClaudeStreamEvent = {
  // @ts-expect-error - ClaudeStreamEvent only accepts Claude event types
  type: 'thread.started',
  // @ts-expect-error - ClaudeStreamEvent only accepts Claude event types
  data: { thread_id: '123' },
};

// =============================================================================
// Message Content Type Tests
// =============================================================================

// TextContent should have correct structure
const textContent: TextContent = {
  type: 'text',
  text: 'Hello world',
};

// @ts-expect-error - text is required
const missingText: TextContent = {
  type: 'text',
};

// ThinkingContent should have correct structure
const thinkingContent: ThinkingContent = {
  type: 'thinking',
  thinking: 'Let me think...',
  signature: 'optional-sig',
};

// @ts-expect-error - thinking is required
const missingThinking: ThinkingContent = {
  type: 'thinking',
};

// ToolUseContent should have correct structure
const toolUseContent: ToolUseContent = {
  type: 'tool_use',
  id: 'tool-123',
  name: 'read_file',
  input: { file_path: '/path/to/file' },
};

// @ts-expect-error - name is required
const missingToolName: ToolUseContent = {
  type: 'tool_use',
  id: 'tool-123',
  input: {},
};

// MessageContent should accept all content types
const content1: MessageContent = textContent;
const content2: MessageContent = thinkingContent;
const content3: MessageContent = toolUseContent;

// ClaudeMessage content can be string or array
const messageWithString: ClaudeMessage = {
  role: 'user',
  content: 'Hello',
};

const messageWithArray: ClaudeMessage = {
  role: 'assistant',
  content: [textContent, thinkingContent],
};

const messageWithWrongContent: ClaudeMessage = {
  role: 'user',
  // @ts-expect-error - content cannot be number
  content: 123,
};

// =============================================================================
// Codex Event Type Tests
// =============================================================================

// ThreadStartedEvent should have correct structure
const threadStarted: ThreadStartedEvent = {
  type: 'thread.started',
  data: {
    thread_id: 'thread-123',
    timestamp: 123456789,
  },
};

const wrongThreadType: ThreadStartedEvent = {
  // @ts-expect-error - type must be 'thread.started'
  type: 'thread.ended',
  data: { thread_id: '123' },
};

// TurnCompletedEvent should have correct structure
const turnCompleted: TurnCompletedEvent = {
  type: 'turn.completed',
  data: {
    turn_id: 'turn-123',
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
    },
  },
};

// ItemCompletedEvent should have correct structure
const itemCompleted: ItemCompletedEvent = {
  type: 'item.completed',
  data: {
    item: {
      type: 'agent_message',
      text: 'Response text',
    },
  },
};

// Removed invalid test - 'as any' bypasses type checking so this won't error properly

// CodexStreamEvent should be a union
const codexEvent1: CodexStreamEvent = threadStarted;
const codexEvent2: CodexStreamEvent = turnCompleted;
const codexEvent3: CodexStreamEvent = itemCompleted;

const wrongCodexEvent: CodexStreamEvent = {
  // @ts-expect-error - CodexStreamEvent only accepts Codex event types
  type: 'user',
  // @ts-expect-error - data doesn't match any Codex event data type
  data: { message: {} },
};

// =============================================================================
// Type Guard Tests
// =============================================================================

// Type guards should narrow types correctly
function testTypeGuards(event: BaseStreamEvent) {
  // Before type guard, we don't know the specific type
  // @ts-expect-error - data might not have messageId
  const beforeId = event.data?.messageId;

  if (isFileHistorySnapshotEvent(event)) {
    // After type guard, TypeScript knows this is FileHistorySnapshotEvent
    const afterId = event.data?.messageId; // ✓ This should work
    event.type; // Should be 'file-history-snapshot'
  }

  if (isUserMessageEvent(event)) {
    // TypeScript knows this is UserMessageEvent
    const uuid = event.data?.uuid; // ✓ This should work
    event.type; // Should be 'user'
  }

  if (isAssistantMessageEvent(event)) {
    // TypeScript knows this is AssistantMessageEvent
    const content = event.data?.message.content; // ✓ This should work
    event.type; // Should be 'assistant'
  }

  if (isThreadStartedEvent(event)) {
    // TypeScript knows this is ThreadStartedEvent
    const threadId = event.data?.thread_id; // ✓ This should work
    event.type; // Should be 'thread.started'
  }

  if (isTurnCompletedEvent(event)) {
    // TypeScript knows this is TurnCompletedEvent
    const usage = event.data?.usage; // ✓ This should work
    event.type; // Should be 'turn.completed'
  }
}

// isClaudeEvent should work with union
function testClaudeEventGuard(event: BaseStreamEvent) {
  if (isClaudeEvent(event)) {
    // TypeScript knows this is ClaudeStreamEvent
    const claudeEvent: ClaudeStreamEvent = event; // ✓ This should work

    // @ts-expect-error - Codex events are not Claude events
    if (event.type === 'thread.started') {
      // @ts-expect-error - event.data is type 'never' here because this branch is unreachable
      const data = event.data;
    }
  }
}

// isCodexEvent should work with union
function testCodexEventGuard(event: BaseStreamEvent) {
  if (isCodexEvent(event)) {
    // TypeScript knows this is CodexStreamEvent
    const codexEvent: CodexStreamEvent = event; // ✓ This should work

    // @ts-expect-error - Claude events are not Codex events
    if (event.type === 'user') {
      // @ts-expect-error - event.data is type 'never' here because this branch is unreachable
      const data = event.data;
    }
  }
}

// =============================================================================
// ExecutionResponse Integration Tests
// =============================================================================

// ExecutionResponse.data should accept StreamEvent[]
const response: ExecutionResponse = {
  output: 'result',
  data: [{ type: 'test', timestamp: 123, data: { foo: 'bar' } }],
  sessionId: 'session-123',
  status: 'success',
  exitCode: 0,
  duration: 1000,
  metadata: {},
};

// Should be able to cast to ClaudeStreamEvent[]
function testClaudeResponse(response: ExecutionResponse) {
  const events = response.data as ClaudeStreamEvent[];

  if (events) {
    for (const event of events) {
      if (event.type === 'assistant') {
        // TypeScript knows event.data is AssistantMessageData
        const content = event.data?.message.content;
      }
    }
  }
}

// Should be able to cast to CodexStreamEvent[]
function testCodexResponse(response: ExecutionResponse) {
  const events = response.data as CodexStreamEvent[];

  if (events) {
    for (const event of events) {
      if (event.type === 'turn.completed') {
        // TypeScript knows event.data is TurnCompletedData
        const usage = event.data?.usage;
      }
    }
  }
}

// Type casting should provide IntelliSense for Claude events
function testClaudeIntelliSense(response: ExecutionResponse) {
  const events = response.data as ClaudeStreamEvent[];

  if (events) {
    for (const event of events) {
      // TypeScript knows all possible types
      switch (event.type) {
        case 'file-history-snapshot':
          // IntelliSense should suggest: messageId, snapshot, isSnapshotUpdate
          const messageId = event.data?.messageId;
          const snapshot = event.data?.snapshot;
          const isUpdate = event.data?.isSnapshotUpdate;
          break;
        case 'user':
          // IntelliSense should suggest: uuid, timestamp, message, sessionId, etc.
          const uuid = event.data?.uuid;
          const userMessage = event.data?.message;
          break;
        case 'assistant':
          // IntelliSense should suggest: uuid, timestamp, message, requestId, etc.
          const assistantUuid = event.data?.uuid;
          const assistantMessage = event.data?.message;
          const requestId = event.data?.requestId;
          break;
      }
    }
  }
}

// Type casting should provide IntelliSense for Codex events
function testCodexIntelliSense(response: ExecutionResponse) {
  const events = response.data as CodexStreamEvent[];

  if (events) {
    for (const event of events) {
      // TypeScript knows all possible types
      switch (event.type) {
        case 'thread.started':
          // IntelliSense should suggest: thread_id, timestamp
          const threadId = event.data?.thread_id;
          break;
        case 'turn.completed':
          // IntelliSense should suggest: turn_id, usage, timestamp
          const turnId = event.data?.turn_id;
          const usage = event.data?.usage;
          break;
        case 'item.completed':
          // IntelliSense should suggest: item, timestamp
          const item = event.data?.item;
          break;
        case 'tool.started':
          // IntelliSense should suggest: toolName, name, input, timestamp
          const toolName = event.data?.toolName;
          break;
        case 'tool_use':
        case 'file.written':
        case 'file.modified':
        case 'usage':
        case 'completion':
          break;
      }
    }
  }
}

// Without casting, data is generic StreamEvent[]
function testGenericResponse(response: ExecutionResponse) {
  const events = response.data; // StreamEvent[] | undefined

  if (events) {
    for (const event of events) {
      // Without casting, data is Record<string, unknown> | undefined
      const genericData = event.data;
      // Optional chaining allows access but type is 'unknown'
      const messageId = event.data?.messageId; // Type: unknown
      // To use it, you need type assertion or casting
      const typedMessageId = event.data?.messageId as string | undefined;
    }
  }
}

// Can't cast to wrong event type without explicit override
function testWrongCast(response: ExecutionResponse) {
  // This is allowed (user responsibility to cast correctly)
  const wrongCast = response.data as ClaudeStreamEvent[];

  // But TypeScript will catch misuse
  if (wrongCast) {
    for (const event of wrongCast) {
      // @ts-expect-error - 'thread.started' is not a Claude event type
      if (event.type === 'thread.started') {
        // @ts-expect-error - event.data is type 'never' here because this branch is unreachable
        const data = event.data;
      }
    }
  }
}

// ExecutionResponse with typed output should still support data casting
function testTypedOutput(response: ExecutionResponse<{ result: string }>) {
  const events = response.data as ClaudeStreamEvent[];
  const typedOutput = response.output; // { result: string }

  // Both work together
  const result = typedOutput.result; // ✓ TypeScript knows this is a string
  if (events && events[0]?.type === 'user') {
    const uuid = events[0].data?.uuid; // ✓ TypeScript knows event.data structure
  }
}

// =============================================================================
// Optional Fields Tests
// =============================================================================

// All event data fields should be optional for defensive programming
const minimalFileSnapshot: FileHistorySnapshotEvent = {
  type: 'file-history-snapshot',
  // data is optional
};

const minimalUserMessage: UserMessageEvent = {
  type: 'user',
  // data is optional
};

const minimalAssistantMessage: AssistantMessageEvent = {
  type: 'assistant',
  // data is optional
};

const minimalThreadStarted: ThreadStartedEvent = {
  type: 'thread.started',
  // data is optional
};

// =============================================================================
// Array and Union Type Tests
// =============================================================================

// Array of mixed Claude events
const claudeEvents: ClaudeStreamEvent[] = [fileSnapshot, userMessage, assistantMessage];

// Array of mixed Codex events
const codexEvents: CodexStreamEvent[] = [threadStarted, turnCompleted, itemCompleted];

// @ts-expect-error - Cannot mix Claude and Codex events in same array without base type
const mixedEvents1: ClaudeStreamEvent[] = [fileSnapshot, threadStarted];

// @ts-expect-error - Cannot mix Claude and Codex events in same array without base type
const mixedEvents2: CodexStreamEvent[] = [threadStarted, userMessage];

// Can use BaseStreamEvent for mixed arrays
const mixedEventsBase: BaseStreamEvent[] = [fileSnapshot, threadStarted, userMessage, turnCompleted];

// =============================================================================
// Discriminated Union Tests
// =============================================================================

// TypeScript should narrow types based on 'type' discriminator
function testDiscriminatedUnion(event: ClaudeStreamEvent) {
  switch (event.type) {
    case 'file-history-snapshot':
      // TypeScript knows this is FileHistorySnapshotEvent
      const snapshot = event.data?.snapshot;
      break;
    case 'user':
      // TypeScript knows this is UserMessageEvent
      const userUuid = event.data?.uuid;
      break;
    case 'assistant':
      // TypeScript knows this is AssistantMessageEvent
      const assistantMessage = event.data?.message;
      break;
    // @ts-expect-error - 'thread.started' is not a Claude event type
    case 'thread.started':
      break;
  }
}

function testCodexDiscriminatedUnion(event: CodexStreamEvent) {
  switch (event.type) {
    case 'thread.started':
      // TypeScript knows this is ThreadStartedEvent
      const threadId = event.data?.thread_id;
      break;
    case 'turn.completed':
      // TypeScript knows this is TurnCompletedEvent
      const usage = event.data?.usage;
      break;
    case 'item.completed':
      // TypeScript knows this is ItemCompletedEvent
      const item = event.data?.item;
      break;
    // @ts-expect-error - 'user' is not a Codex event type
    case 'user':
      break;
  }
}

// =============================================================================
// Type Inference Tests
// =============================================================================

// Type inference should work correctly
const inferredClaudeEvent = {
  type: 'user' as const,
  data: {
    uuid: 'test',
    timestamp: '2024-01-01',
    message: {
      role: 'user' as const,
      content: 'test',
    },
  },
} satisfies UserMessageEvent;

const inferredCodexEvent = {
  type: 'thread.started' as const,
  data: {
    thread_id: 'test-thread',
  },
} satisfies ThreadStartedEvent;

// =============================================================================
// Edge Cases
// =============================================================================

// Empty arrays should be allowed
const emptyMessageContent: MessageContent[] = [];

// Undefined should be allowed for optional fields
const eventWithUndefined: FileHistorySnapshotEvent = {
  type: 'file-history-snapshot',
  timestamp: undefined,
  data: undefined,
};

// Null should not be allowed for optional fields
const eventWithNull: FileHistorySnapshotEvent = {
  type: 'file-history-snapshot',
  // @ts-expect-error - null is not assignable to optional fields
  timestamp: null,
};

// =============================================================================
// Generic Function Tests
// =============================================================================

// Generic function that works with any event type
function processEvent<T extends BaseStreamEvent>(event: T): T['type'] {
  return event.type;
}

const claudeType = processEvent(fileSnapshot); // Should infer 'file-history-snapshot'
const codexType = processEvent(threadStarted); // Should infer 'thread.started'

// Generic function with type narrowing
function extractEventData<T extends ClaudeStreamEvent>(event: T): T['data'] {
  return event.data;
}

const snapshotData = extractEventData(fileSnapshot); // Should infer FileHistorySnapshotData | undefined
const userData = extractEventData(userMessage); // Should infer UserMessageData | undefined

// =============================================================================
// Export to verify all types are used (prevents unused code errors)
// =============================================================================

export type {
  // Prevents "declared but never used" errors
  ClaudeStreamEvent,
  CodexStreamEvent,
  BaseStreamEvent,
  FileHistorySnapshotEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  ThreadStartedEvent,
  TurnCompletedEvent,
  ItemCompletedEvent,
  MessageContent,
  TextContent,
  ThinkingContent,
  ToolUseContent,
  ClaudeMessage,
  ExecutionResponse,
};
