# agent-cli-sdk Examples

This directory contains examples demonstrating various use cases of the agent-cli-sdk.

## Running Examples

All examples can be run using `tsx` or `bun`:

```bash
# From the agent-cli-sdk package directory

# Using tsx
pnpm exec tsx examples/<category>/<example-name>.ts

# Using npx
npx tsx examples/<category>/<example-name>.ts

# Using Bun (faster startup)
bun examples/<category>/<example-name>.ts
```

## Basic Examples

### Claude Basic (`basic/claude.ts`)

Simple single-message execution with Claude.

```bash
tsx examples/basic/claude.ts
```

### Codex Basic (`basic/codex.ts`)

Simple single-message execution with Codex.

```bash
tsx examples/basic/codex.ts
```

## Session Examples

### Session Chat (`sessions/session-chat.ts`)

Multi-turn conversation demonstrating session state management.

```bash
tsx examples/sessions/session-chat.ts
```

### Codex Session (`sessions/codex-session.ts`)

Session management with Codex adapter.

```bash
tsx examples/sessions/codex-session.ts
```

## Advanced Examples

### Structured Output (`advanced/structured-output.ts`)

Demonstrates JSON parsing and structured data extraction.

```bash
tsx examples/advanced/structured-output.ts
```

### WebSocket Server (`advanced/websocket-server.ts`)

WebSocket server for real-time streaming to web clients.

```bash
tsx examples/advanced/websocket-server.ts
```

### Interactive Relay (`advanced/interactive-relay.ts`)

**Requires interactive terminal (TTY)**

Two-session pattern demonstrating:
- Real-time streaming output from multiple Claude sessions
- Interactive user input with Node.js readline
- Session coordination (relay pattern)
- Session 1 asks 3 questions → User responds to each → Session 2 summarizes ALL answers
- Verification that user input is correctly transmitted (shows both raw answers and agent's summary)

```bash
# Must be run in an interactive terminal

# Using tsx
tsx examples/advanced/interactive-relay.ts

# Using Bun (faster)
bun examples/advanced/interactive-relay.ts
```

**Note:** This example will not work when run via npm/pnpm scripts or in non-TTY environments. Run it directly in your terminal.

## Example Structure

- `basic/` - Simple single-execution examples
- `sessions/` - Multi-turn conversation patterns
- `advanced/` - Complex patterns (streaming, WebSocket, interactive I/O)

## Typed Events (`typed-events.ts`)

**NEW:** Type-safe event handling with full TypeScript support.

The SDK now provides complete TypeScript types for all CLI response events from different adapters (Claude Code, Codex, etc.).

### Features

- **Type-safe event access** - IntelliSense and autocomplete for event properties
- **Runtime type guards** - Helper functions to safely check event types
- **Adapter-specific types** - Dedicated types for each CLI tool

### Quick Example

```typescript
import { Claude } from '@repo/agent-cli-sdk';
import type { ClaudeStreamEvent } from '@repo/agent-cli-sdk';
import { isAssistantMessageEvent } from '@repo/agent-cli-sdk';

const claude = new Claude();
const response = await claude.execute('Hello');

// Type-safe event access
const events = response.events as ClaudeStreamEvent[];

for (const event of events) {
  if (isAssistantMessageEvent(event)) {
    // TypeScript knows event.data is AssistantMessageData
    console.log(event.data?.message.content);
  }
}
```

### Available Types

**Claude Events:**
- `ClaudeStreamEvent` - Union of all Claude event types
- `FileHistorySnapshotEvent` - File backup snapshots
- `UserMessageEvent` - User messages and commands
- `AssistantMessageEvent` - Assistant responses (text, thinking, tool use)

**Codex Events:**
- `CodexStreamEvent` - Union of all Codex event types
- `ThreadStartedEvent` - Session initialization
- `TurnCompletedEvent` - Turn completion with usage stats
- `ItemCompletedEvent` - Individual items (messages, tool calls)
- `ToolStartedEvent` - Tool execution started

### Type Guards

**Claude:**
- `isClaudeEvent()`, `isFileHistorySnapshotEvent()`, `isUserMessageEvent()`, `isAssistantMessageEvent()`

**Codex:**
- `isCodexEvent()`, `isThreadStartedEvent()`, `isTurnCompletedEvent()`, `isItemCompletedEvent()`, `isToolStartedEvent()`

### Running the Example

```bash
tsx examples/typed-events.ts
```

See the example file for complete demonstrations of:
- Basic typed event handling
- Using type guards
- Extracting tool usage
- Analyzing token usage
- Streaming with types

## Requirements

- Node.js >= 22
- Claude Code CLI or OpenAI Codex CLI installed (depending on example)
- For interactive examples: TTY-capable terminal
