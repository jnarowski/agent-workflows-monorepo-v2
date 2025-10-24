# Typed Events - Agent CLI SDK

## Overview

The agent-cli-sdk now includes comprehensive TypeScript type definitions for all CLI response events. This provides full IntelliSense support and type safety when working with event data from Claude Code, Codex, and other CLI adapters.

## What's New

### ✅ Type-Safe Event Handling

Instead of generic `Record<string, unknown>`, you now get fully-typed event data:

```typescript
// Before
const events = response.events; // StreamEvent[]
const message = event.data?.message; // any

// After
const events = response.events as ClaudeStreamEvent[];
const message = event.data?.message; // ClaudeMessage (fully typed!)
```

### ✅ Adapter-Specific Types

Separate type definitions for each CLI adapter:

**Claude Code:**
- `ClaudeStreamEvent` - Union type for all Claude events
- `FileHistorySnapshotEvent`, `UserMessageEvent`, `AssistantMessageEvent`

**Codex:**
- `CodexStreamEvent` - Union type for all Codex events
- `ThreadStartedEvent`, `TurnCompletedEvent`, `ItemCompletedEvent`, `ToolStartedEvent`

### ✅ Runtime Type Guards

Helper functions for safe type checking:

```typescript
import { isAssistantMessageEvent } from '@repo/agent-cli-sdk';

if (isAssistantMessageEvent(event)) {
  // TypeScript knows this is AssistantMessageEvent
  const content = event.data.message.content;
}
```

## File Structure

```
packages/agent-cli-sdk/src/types/events/
├── base.ts          # Base event types
├── claude.ts        # Claude Code event types
├── codex.ts         # Codex event types
└── index.ts         # Barrel exports
```

## Usage

### 1. Import Types

```typescript
import type {
  ClaudeStreamEvent,
  CodexStreamEvent,
  AssistantMessageEvent,
} from '@repo/agent-cli-sdk';

// Import type guards
import {
  isAssistantMessageEvent,
  isUserMessageEvent,
} from '@repo/agent-cli-sdk';
```

### 2. Cast Response Events

```typescript
import { Claude } from '@repo/agent-cli-sdk';
import type { ClaudeStreamEvent } from '@repo/agent-cli-sdk';

const claude = new Claude();
const response = await claude.execute('Hello');

// Cast to get type-safe access
const events = response.events as ClaudeStreamEvent[];
```

### 3. Use Type Guards

```typescript
for (const event of events) {
  if (isAssistantMessageEvent(event)) {
    // Full type safety for AssistantMessageEvent
    const content = event.data?.message.content;

    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text') {
          console.log(block.text);
        } else if (block.type === 'thinking') {
          console.log(block.thinking);
        } else if (block.type === 'tool_use') {
          console.log(block.name, block.input);
        }
      }
    }
  }
}
```

## Claude Event Types

### FileHistorySnapshotEvent

Tracks file backups and version history.

```typescript
{
  type: 'file-history-snapshot',
  data: {
    messageId: string;
    snapshot: {
      messageId: string;
      trackedFileBackups: Record<string, {
        backupFileName: string;
        version: number;
        backupTime: string;
      }>;
      timestamp: string;
    };
    isSnapshotUpdate: boolean;
  }
}
```

### UserMessageEvent

User messages, commands, and tool results.

```typescript
{
  type: 'user',
  data: {
    uuid: string;
    timestamp: string;
    message: {
      role: 'user';
      content: string | MessageContent[];
    };
    sessionId?: string;
    cwd?: string;
    toolUseResult?: ToolUseResult;
  }
}
```

### AssistantMessageEvent

Assistant responses with text, thinking, and tool use.

```typescript
{
  type: 'assistant',
  data: {
    uuid: string;
    timestamp: string;
    message: {
      role: 'assistant';
      content: MessageContent[]; // Array of text, thinking, tool_use blocks
      model?: string;
      usage?: ClaudeTokenUsage;
    };
    requestId?: string;
  }
}
```

### Message Content Types

Assistant messages contain typed content blocks:

```typescript
type MessageContent =
  | TextContent          // { type: 'text', text: string }
  | ThinkingContent      // { type: 'thinking', thinking: string }
  | ToolUseContent       // { type: 'tool_use', name: string, input: {...} }
  | ToolResultContent;   // { type: 'tool_result', content: string }
```

## Codex Event Types

### ThreadStartedEvent

Session initialization.

```typescript
{
  type: 'thread.started',
  data: {
    thread_id: string;
    timestamp?: number;
  }
}
```

### TurnCompletedEvent

Turn completion with token usage.

```typescript
{
  type: 'turn.completed',
  data: {
    turn_id?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  }
}
```

### ItemCompletedEvent

Completed items (messages, tool calls, etc.).

```typescript
{
  type: 'item.completed',
  data: {
    item: {
      type: 'agent_message' | 'user_message' | 'tool_call' | 'tool_result';
      text?: string;
      content?: unknown;
    };
  }
}
```

## Type Guards Reference

### Claude Type Guards

- `isClaudeEvent(event)` - Check if event is any Claude event
- `isFileHistorySnapshotEvent(event)` - File snapshot event
- `isUserMessageEvent(event)` - User message event
- `isAssistantMessageEvent(event)` - Assistant message event

### Codex Type Guards

- `isCodexEvent(event)` - Check if event is any Codex event
- `isThreadStartedEvent(event)` - Thread start event
- `isTurnCompletedEvent(event)` - Turn completion event
- `isItemCompletedEvent(event)` - Item completion event
- `isToolStartedEvent(event)` - Tool start event
- `isFileWrittenEvent(event)` - File write event
- `isFileModifiedEvent(event)` - File modification event

## Examples

See `examples/typed-events.ts` for complete working examples:

1. Basic typed event handling
2. Using type guards for safety
3. Codex event handling
4. Extracting tool usage information
5. Analyzing token usage

## Backward Compatibility

The generic `StreamEvent` type is still available and unchanged:

```typescript
export interface StreamEvent {
  type: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}
```

Existing code continues to work without modification. The new types are opt-in via type casting.

## Migration Guide

### Step 1: Import Adapter Types

```typescript
import type { ClaudeStreamEvent } from '@repo/agent-cli-sdk';
```

### Step 2: Cast Response Events

```typescript
const events = response.events as ClaudeStreamEvent[];
```

### Step 3: Use Type Guards (Optional)

```typescript
import { isAssistantMessageEvent } from '@repo/agent-cli-sdk';

if (isAssistantMessageEvent(event)) {
  // Type-safe access to event.data
}
```

## Benefits

✅ **IntelliSense** - Full autocomplete for all event properties
✅ **Type Safety** - Catch errors at compile time
✅ **Self-Documenting** - Types serve as documentation
✅ **Refactor-Safe** - TypeScript catches breaking changes
✅ **Backward Compatible** - Generic types still available

## Future Adapters

The type system is designed to easily accommodate new CLI adapters:

```typescript
// packages/agent-cli-sdk/src/types/events/openai.ts
export interface OpenAIStreamEvent { ... }

// Add to union type in events/index.ts
export type AdapterStreamEvent =
  | ClaudeStreamEvent
  | CodexStreamEvent
  | OpenAIStreamEvent;
```
