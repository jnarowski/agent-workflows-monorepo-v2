# Agent CLI SDK

TypeScript SDK for orchestrating AI-powered CLI tools (Claude Code, OpenAI Codex) in development workflows.

## Features

- **Lightweight Adapters** - Direct adapter classes with no wrapper layers
- **Type-Safe Events** - Full TypeScript support with event type guards
- **Session Management** - Built-in session continuation with `sessionId` and `resume`
- **Streaming Support** - Real-time output and event streaming with callbacks
- **Multi-Agent** - Easy switching between Claude, Codex, and future adapters
- **Structured Output** - JSON extraction with optional Zod schema validation

## Installation

```bash
npm install @repo/agent-cli-sdk
# or
pnpm add @repo/agent-cli-sdk
# or
yarn add @repo/agent-cli-sdk
```

## Prerequisites

- **Claude Code**: Install from [claude.ai/download](https://claude.ai/download)
- **OpenAI Codex**: Install from [github.com/openai/openai-cli](https://github.com/openai/openai-cli)

## Quick Start

### Basic Usage

```typescript
import { ClaudeAdapter } from '@repo/agent-cli-sdk';

const claude = new ClaudeAdapter({
  verbose: true,
});

const result = await claude.execute('What is 2 + 2?', {
  onOutput: (data) => {
    process.stdout.write(data.raw);
  },
});

console.log('Session ID:', result.sessionId);
console.log('Status:', result.status);
console.log('Output:', result.data);
```

### Session Continuation

Maintain context across multiple messages using `sessionId` and `resume`:

```typescript
import { ClaudeAdapter } from '@repo/agent-cli-sdk';

const claude = new ClaudeAdapter();

// First message - creates a new session
const result1 = await claude.execute('Remember this: my favorite color is blue');

const sessionId = result1.sessionId;

// Second message - continues the session
const result2 = await claude.execute('What is my favorite color?', {
  sessionId,
  resume: true,
});

// result2.data will reference "blue"
```

### Streaming

Handle real-time output and events:

```typescript
import { ClaudeAdapter, isUserMessageEvent, isAssistantMessageEvent } from '@repo/agent-cli-sdk';

const claude = new ClaudeAdapter();

await claude.execute('Write a haiku about coding', {
  onOutput: (data) => {
    // Stream raw output to console
    process.stdout.write(data.raw);
  },
  onEvent: (event) => {
    // Handle typed events with type guards
    if (isUserMessageEvent(event)) {
      console.log('User:', event.data.message);
    } else if (isAssistantMessageEvent(event)) {
      console.log('Assistant:', event.data.message);
    }
  },
});
```

### Multi-Agent Usage

Switch between adapters dynamically:

```typescript
import { getAdapter } from '@repo/agent-cli-sdk';

// Get adapter by name (type-safe)
const adapter = getAdapter('claude', { verbose: true });
// or
const adapter = getAdapter('codex', { fullAuto: true });

const result = await adapter.execute('What can you do?');
console.log('Adapter:', adapter.name);
```

### Structured Output

Extract and validate JSON responses with Zod schemas:

```typescript
import { ClaudeAdapter } from '@repo/agent-cli-sdk';
import { z } from 'zod';

const claude = new ClaudeAdapter();

// Define schema
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(18),
});

type User = z.infer<typeof UserSchema>;

// Execute with validation
const result = await claude.execute<User>(
  'Return a JSON object with name="Alice", email="alice@example.com", age=25',
  {
    responseSchema: UserSchema,
  }
);

// result.data is fully typed and validated
console.log(result.data.name); // "Alice"
console.log(result.data.email); // "alice@example.com"
```

## API Reference

### ClaudeAdapter

```typescript
class ClaudeAdapter {
  constructor(config?: ClaudeConfig)
  execute<T = string>(prompt: string, options?: ClaudeOptions): Promise<ExecutionResponse<T>>
  name: string // "claude"
}
```

**Config Options:**
- `cliPath?: string` - Path to Claude CLI (auto-detected if not provided)
- `verbose?: boolean` - Enable verbose logging
- `model?: string` - Model to use (e.g., "sonnet", "haiku")
- `apiKey?: string` - Claude API key
- `oauthToken?: string` - OAuth token
- `workingDir?: string` - Working directory for execution

**Execute Options:**
- `sessionId?: string` - Session ID for continuation
- `resume?: boolean` - Resume existing session
- `timeout?: number` - Execution timeout in ms
- `onOutput?: (data: OutputData) => void` - Output callback
- `onEvent?: (event: ClaudeStreamEvent) => void` - Event callback
- `logPath?: string` - Path for logging input/output
- `responseSchema?: ZodSchema | true` - JSON extraction/validation
- Plus all config options (merged with constructor config)

### CodexAdapter

```typescript
class CodexAdapter {
  constructor(config?: CodexConfig)
  execute<T = string>(prompt: string, options?: CodexOptions): Promise<ExecutionResponse<T>>
  name: string // "codex"
}
```

**Config Options:**
- `cliPath?: string` - Path to Codex CLI (auto-detected if not provided)
- `model?: string` - Model to use
- `sandbox?: 'full' | 'read-only' | 'none'` - Sandbox mode
- `fullAuto?: boolean` - Enable full auto mode
- `workingDir?: string` - Working directory

**Execute Options:**
- Similar to ClaudeAdapter plus Codex-specific options
- `dangerouslyBypassApprovalsAndSandbox?: boolean` - Skip approvals
- `images?: string[]` - Image file paths
- `search?: boolean` - Enable search capability

### ExecutionResponse

```typescript
interface ExecutionResponse<T = string> {
  status: 'success' | 'error'
  data: T                        // Parsed output (string or structured data)
  output?: string                // Raw text output
  sessionId?: string             // Session identifier
  exitCode?: number              // Process exit code
  duration: number               // Execution time in ms
  metadata: Record<string, any>  // Additional metadata
  usage?: TokenUsage             // Token usage stats
  raw?: {                        // Raw process output
    stdout: string
    stderr: string
  }
  error?: {                      // Error details (if status === 'error')
    code: string
    message: string
    details?: any
  }
}
```

### Event Types

**Claude Events:**
- `ClaudeStreamEvent` - Union of all Claude event types
- Event types: `file_history_snapshot`, `user_message`, `assistant_message`
- Type guards: `isClaudeEvent()`, `isFileHistorySnapshotEvent()`, `isUserMessageEvent()`, `isAssistantMessageEvent()`

**Codex Events:**
- `CodexStreamEvent` - Union of all Codex event types
- Event types: `thread.started`, `turn.completed`, `item.completed`, etc.
- Type guards: `isCodexEvent()`, `isThreadStartedEvent()`, `isTurnCompletedEvent()`, etc.

### Helper Functions

```typescript
// Get adapter by name (type-safe)
function getAdapter(name: 'claude', config?: ClaudeConfig): ClaudeAdapter
function getAdapter(name: 'codex', config?: CodexConfig): CodexAdapter
function getAdapter(name: 'cursor', config?: CursorConfig): CursorAdapter
function getAdapter(name: 'gemini', config?: GeminiConfig): GeminiAdapter

// JSON utilities
function extractJSON(text: string): any | null
function parseJSONL(text: string): any[]
function safeJSONParse(text: string): { success: true; data: any } | { success: false; error: Error }
```

## Examples

See the [examples](./examples) directory for more:

- [examples/basic/claude.ts](./examples/basic/claude.ts) - Basic Claude usage
- [examples/basic/codex.ts](./examples/basic/codex.ts) - Basic Codex usage
- [examples/session-continuation.ts](./examples/session-continuation.ts) - Session management
- [examples/streaming.ts](./examples/streaming.ts) - Streaming patterns
- [examples/multi-agent.ts](./examples/multi-agent.ts) - Dynamic adapter selection
- [examples/advanced/structured-output.ts](./examples/advanced/structured-output.ts) - JSON validation

## Architecture

```
src/
├── claude/           # Claude adapter implementation
│   ├── index.ts      # ClaudeAdapter class
│   ├── types.ts      # Claude-specific types
│   ├── events.ts     # Claude event types
│   └── ...           # Utilities (cli-detector, parser, etc.)
├── codex/            # Codex adapter implementation
│   ├── index.ts      # CodexAdapter class
│   ├── types.ts      # Codex-specific types
│   ├── events.ts     # Codex event types
│   └── ...           # Utilities
├── cursor/           # Cursor adapter (stub)
├── gemini/           # Gemini adapter (stub)
├── shared/           # Shared utilities
│   ├── types.ts      # Base types
│   ├── errors.ts     # Error classes
│   ├── spawn.ts      # Process spawning
│   ├── logging.ts    # File logging
│   └── json-parser.ts # JSON utilities
└── index.ts          # Main exports
```

## Migration from 3.x

Version 4.0.0 is a complete architectural rewrite with **no backwards compatibility**.

### Breaking Changes

**Removed:**
- `AgentClient` wrapper class
- `createClaudeAdapter()` factory function
- `Session` class and `client.createSession()`
- `client.listActiveSessions()`
- `BaseAdapter` inheritance pattern

**New Pattern:**

```typescript
// OLD (3.x)
import { AgentClient, createClaudeAdapter } from '@repo/agent-cli-sdk';
const client = new AgentClient({ adapter: createClaudeAdapter() });
const session = client.createSession();
await session.send('Hello');

// NEW (4.0)
import { ClaudeAdapter } from '@repo/agent-cli-sdk';
const claude = new ClaudeAdapter();
const result1 = await claude.execute('Hello');
const result2 = await claude.execute('Continued', {
  sessionId: result1.sessionId,
  resume: true,
});
```

### Why 4.0?

- **60% Less Code** - Removed unnecessary abstractions
- **Simpler API** - Direct adapter usage, no wrapper layers
- **Better TypeScript** - Improved type inference and safety
- **Easier Extension** - Adding new adapters (Cursor, Gemini) is trivial
- **Same Functionality** - All features preserved, just simpler

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
