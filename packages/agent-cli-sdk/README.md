# agent-cli-sdk-three

> TypeScript SDK for orchestrating AI-powered CLI tools (Claude Code, OpenAI Codex) in development workflows

[![npm version](https://badge.fury.io/js/%40sourceborn%2Fagent-cli-sdk-three.svg)](https://www.npmjs.com/package/@sourceborn/agent-cli-sdk-three)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Dependency Injection Architecture** - Clean separation of concerns with adapter pattern
- **Dual API** - Simple string shorthand OR custom adapter instances
- **Type-Safe** - Full TypeScript support with strict mode
- **Session Management** - Multi-turn conversations with automatic resumption
- **Dual Output** - Raw stdout and parsed JSONL events simultaneously
- **Non-blocking Logging** - Optional execution logging that never breaks execution
- **Extensible** - Easy to add custom adapters for third-party CLIs
- **Testable** - Mock adapters for testing without real CLIs

## Adapter Feature Comparison

| Feature | Claude Adapter | Codex Adapter | Notes |
|---------|---------------|---------------|-------|
| **Basic Execution** | ✅ | ✅ | Both support prompt execution |
| **Session Management** | ✅ via `createSession()` | ⚠️ via `sessionId` param | Codex uses execute() with sessionId, no Session object |
| **Streaming Output** | ✅ | ✅ | Real-time output callbacks |
| **Event Streaming** | ✅ | ✅ | JSONL event parsing |
| **Multi-modal (Images)** | ✅ | ✅ | Image input support |
| **Tool Calling** | ✅ | ✅ | Both support tool execution |
| **Structured Output** | ✅ | ⚠️ Partial | Claude has full Zod validation support |
| **Timeout Handling** | ✅ | ✅ | Configurable execution timeouts |
| **Approval Policies** | ✅ | ❌ | Claude supports various approval modes |
| **Sandbox Modes** | ✅ | ✅ | File system access control |
| **Session Abort** | ✅ | ❌ | Prevents new messages (not in-flight) |
| **MCP Server Support** | ✅ | ❌ | Claude-specific feature |
| **Working Directory** | ✅ | ✅ | Both support custom working dirs |
| **Model Selection** | ✅ | ✅ | Choose specific AI models |
| **Token Usage Tracking** | ✅ | ✅ | Both track input/output tokens |
| **Execution Logging** | ✅ | ✅ | Automatic log file generation |

**Legend:**
- ✅ Full support
- ⚠️ Partial support or alternative implementation
- ❌ Not supported

**Notes:**
- **Codex Session Management**: While Codex doesn't have a `createSession()` method, you can maintain sessions by passing `sessionId` to subsequent `execute()` calls. This is a lower-level approach compared to Claude's Session object.
- **Session Abort**: Both adapters' abort functionality only prevents new messages from being sent, not terminating in-flight executions due to the spawn-per-message model.
- **Structured Output**: Codex support is planned for future versions.

## Installation

```bash
npm install @sourceborn/agent-cli-sdk-three
# or
pnpm add @sourceborn/agent-cli-sdk-three
# or
yarn add @sourceborn/agent-cli-sdk-three
```

## Quick Start

### Simple Usage (Factory Pattern)

```typescript
import { AgentClient, createClaudeAdapter } from '@sourceborn/agent-cli-sdk-three';

// Create adapter
const claude = createClaudeAdapter();

// Create client
const client = new AgentClient({ adapter: claude });

// Execute a prompt
const result = await client.execute('Create a hello world function', {
  onOutput: (raw) => process.stdout.write(raw),
  onEvent: (event) => console.log('Event:', event.type),
});

console.log('Session ID:', result.sessionId);
console.log('Output:', result.output);
```

### Session Mode (Multi-turn Conversations)

```typescript
import { AgentClient, createClaudeAdapter } from '@sourceborn/agent-cli-sdk-three';

const client = new AgentClient({ adapter: createClaudeAdapter() });

// Create a session
const session = client.createSession({
  logPath: './logs/my-session',
  onOutput: (raw) => process.stdout.write(raw),
});

// Send multiple messages (auto-resumes)
await session.send('Create a function');
await session.send('Add tests for it');
await session.send('Add error handling');

console.log('Messages sent:', session.messageCount);
console.log('Session ID:', session.sessionId);
```

### Structured Output & Type Safety

Get type-safe JSON responses with automatic parsing and validation using Zod schemas:

```typescript
import { AgentClient, createClaudeAdapter } from '@sourceborn/agent-cli-sdk-three';
import { z } from 'zod';

const client = new AgentClient({ adapter: createClaudeAdapter() });

// Define a Zod schema
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18),
  role: z.enum(['admin', 'user', 'guest']),
});

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;

// Execute with schema validation
const result = await client.execute<User>(
  'Return user data as JSON: name="Alice", email="alice@example.com", age=25, role="user"',
  {
    responseSchema: UserSchema, // Validates and parses JSON
  }
);

// Fully typed output!
console.log(result.output.name);  // TypeScript knows this is a string
console.log(result.output.age);   // TypeScript knows this is a number
```

**Features:**
- **Auto JSON extraction** - Handles markdown code blocks and plain JSON
- **Zod validation** - Type-safe schemas with runtime validation
- **Generic types** - Full TypeScript inference from schemas
- **Nested schemas** - Support for complex nested objects and arrays
- **Defaults & transformations** - Leverage Zod's transformation features

**Example with nested schema:**

```typescript
const ProjectSchema = z.object({
  name: z.string(),
  team: z.object({
    lead: z.string(),
    members: z.array(z.string()),
  }),
  milestones: z.array(z.object({
    title: z.string(),
    completed: z.boolean(),
  })),
});

type Project = z.infer<typeof ProjectSchema>;

const result = await client.execute<Project>(
  'Create a project structure with team and milestones...',
  { responseSchema: ProjectSchema }
);
```

**Without validation** (just extract JSON):

```typescript
// Use `true` to extract JSON without validation
const result = await client.execute<{ count: number }>(
  'Return {"count": 42}',
  { responseSchema: true }
);
```

See [examples/advanced/structured-output.ts](./examples/advanced/structured-output.ts) for complete examples.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                        User Code                            │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
        ┌───────────▼────────┐  ┌──────▼──────────┐
        │  Factory Pattern   │  │  Direct Pattern │
        │  (Convenience)     │  │  (Advanced)     │
        ├────────────────────┤  ├─────────────────┤
        │ createClaudeAdapter│  │ new ClaudeAdapter│
        │ createCodexAdapter │  │ new CustomAdapter│
        └───────────┬────────┘  └──────┬──────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   AgentClient     │
                    │ (Orchestration)   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │    AIAdapter      │
                    │   (Interface)     │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   BaseAdapter     │
                    │ (Shared Logic)    │
                    └─────────┬─────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌───────▼────────┐
        │ ClaudeAdapter  │         │ CodexAdapter   │
        │ (Claude CLI)   │         │ (Codex CLI)    │
        └────────────────┘         └────────────────┘
```

### Key Design Principles

1. **Dependency Injection** - Adapters are created independently and injected into the client
2. **Adapter Pattern** - Clean abstraction layer between client and CLI-specific implementations
3. **Factory Functions** - Convenient creation with sensible defaults
4. **Spawn-per-message** - Each execution spawns a fresh process (no long-running PTY)
5. **Dual output** - Emit both raw stdout and parsed JSONL events simultaneously

## API Reference

### AgentClient

Main orchestration class for executing prompts and managing sessions.

```typescript
class AgentClient {
  constructor(options: AgentClientOptions)
  execute<T = string>(prompt: string, options?: ExecuteOptions): Promise<ExecutionResponse<T>>
  createSession(options?: SessionOptions): Session
  getSession(sessionId: string): Session | undefined
  abortSession(sessionId: string): boolean
  listActiveSessions(): SessionInfo[]
  getAdapter(): AIAdapter
  getCapabilities(): AdapterCapabilities
}
```

#### AgentClientOptions

```typescript
interface AgentClientOptions {
  // Option 1: String shorthand
  adapter: 'claude' | 'codex';

  // OR Option 2: Custom adapter instance
  adapter: AIAdapter;

  // Shared configuration
  workingDirectory?: string;
  verbose?: boolean;
  logPath?: string;
}
```

#### ExecuteOptions

```typescript
interface ExecuteOptions {
  // Session management
  sessionId?: string;
  resume?: boolean;

  // Callbacks
  onOutput?: (data: OutputData) => void;
  onEvent?: (event: StreamEvent) => void;

  // Execution control
  workingDirectory?: string;
  timeout?: number;
  streaming?: boolean;

  // Logging
  logPath?: string;

  // Adapter-specific options
  [key: string]: unknown;
}

interface OutputData {
  raw: string;              // Raw stdout chunk
  events?: StreamEvent[];   // Parsed JSONL events from this chunk
  text?: string;            // Text content extracted from events
  accumulated: string;      // All text accumulated so far
}
```

### Session

Multi-turn conversation wrapper with event emitting.

```typescript
class Session extends EventEmitter {
  readonly sessionId?: string;
  readonly messageCount: number;
  readonly startedAt: number;
  lastMessageAt?: number;

  send<T = string>(message: string, options?: SendOptions): Promise<ExecutionResponse<T>>
  abort(): void
  getSessionId(): string | undefined
  getMessageCount(): number

  // Events
  on('output', (data: OutputData) => void)
  on('event', (event: StreamEvent) => void)
  on('complete', (result: ExecutionResponse) => void)
  on('error', (error: Error) => void)
  on('aborted', () => void)
}
```

### ClaudeAdapter

Claude CLI-specific adapter implementation.

```typescript
class ClaudeAdapter extends BaseAdapter {
  constructor(config?: ClaudeConfig)
  execute<T = string>(prompt: string, options?: ClaudeExecutionOptions): Promise<ExecutionResponse<T>>
  getCapabilities(): AdapterCapabilities
  createSession(options?: SessionOptions): ClaudeSession
}
```

#### ClaudeConfig

```typescript
interface ClaudeConfig {
  cliPath?: string;
  workingDir?: string;
  verbose?: boolean;
  apiKey?: string;
  oauthToken?: string;
}
```

#### ClaudeExecutionOptions

```typescript
interface ClaudeExecutionOptions extends ExecutionOptions {
  model?: 'opus' | 'sonnet' | 'haiku';
  dangerouslySkipPermissions?: boolean;
  permissionMode?: 'default' | 'plan' | 'acceptEdits' | 'reject';
  toolSettings?: {
    allowedTools?: string[];
    disallowedTools?: string[];
  };
  images?: ImageInput[];
}
```

### Factory Functions

#### createClaudeAdapter

```typescript
function createClaudeAdapter(config?: ClaudeConfig): ClaudeAdapter
```

Creates a Claude adapter with sensible defaults. Warns if both API key and OAuth token are available.

#### createCodexAdapter

```typescript
function createCodexAdapter(config?: CodexConfig): CodexAdapter
```

Creates a Codex adapter with sensible defaults. (Coming in Phase 4)

## Usage Examples

### Example 1: Basic Execution

```typescript
import { AgentClient, createClaudeAdapter } from '@sourceborn/agent-cli-sdk-three';

const client = new AgentClient({ adapter: createClaudeAdapter() });

const result = await client.execute('What is 2 + 2?');
console.log(result.output);
```

### Example 2: Streaming Output

```typescript
const result = await client.execute('Create a complex function', {
  onOutput: (data) => process.stdout.write(data.raw),
  onEvent: (event) => {
    if (event.type === 'tool.started') {
      console.log(`[Tool: ${event.data?.toolName}]`);
    }
  },
});
```

#### Understanding `onEvent` vs `onOutput`

The SDK provides two callback mechanisms for streaming output:

**`onOutput(data: OutputData)`** - Enhanced output data
- Receives an **OutputData object** with multiple representations:
  - `data.raw` - Raw stdout chunk (unprocessed string)
  - `data.events` - Parsed JSONL events from this chunk
  - `data.text` - Extracted text content from events
  - `data.accumulated` - All text accumulated so far in the execution
- Provides everything you need in one callback
- Useful for displaying output, tracking progress, or building UIs
- Called for every chunk of data from stdout

**`onEvent(event: StreamEvent)`** - Parsed JSONL events
- Receives **structured event objects** parsed from the CLI's `--output-format stream-json`
- Event objects have `{ type: string, timestamp?: number, data?: Record<string, unknown> }`
- Provides typed events like:
  - `turn.started` - When a turn begins
  - `turn.completed` - When a turn finishes
  - `text` - Text content from assistant messages
  - `tool.started` / `tool.completed` - Tool usage events
  - `assistant` - Assistant message events
  - `result` - Final result event
- Useful for reacting to specific events or tracking detailed execution flow

**How they work together:**
- Both callbacks automatically parse JSONL from stdout when provided
- Use `onOutput` when you need the raw data plus convenient access to text
- Use `onEvent` when you need fine-grained event handling
- You can use both together for maximum flexibility

**Example:**

```typescript
const result = await client.execute('Say hello', {
  onOutput: (data) => {
    // Access raw output
    console.log('Raw chunk:', data.raw);

    // Display only the text
    if (data.text) {
      process.stdout.write(data.text);
    }

    // Show accumulated progress
    console.log('Total text so far:', data.accumulated.length, 'chars');
  },
  onEvent: (event) => {
    // React to specific events
    if (event.type === 'text') {
      console.log('Assistant:', event.data);
    }
  },
});
```

### Example 3: Multi-turn Session

```typescript
const session = client.createSession();

const msg1 = await session.send('Create a user schema');
const msg2 = await session.send('Add validation');
const msg3 = await session.send('Export as TypeScript types');

console.log(`Conversation used ${session.messageCount} messages`);
```

### Example 4: Custom Adapter Configuration

```typescript
const claude = createClaudeAdapter({
  cliPath: '/custom/path/to/claude',
  verbose: true,
  workingDir: '/my/project',
  dangerouslySkipPermissions: false,
});

const client = new AgentClient({ adapter: claude });
```

### Example 5: Multiple Adapters

```typescript
const claudeClient = new AgentClient({ adapter: createClaudeAdapter() });
const codexClient = new AgentClient({ adapter: createCodexAdapter() });

// Generate with Claude
const code = await claudeClient.execute('Create email validator');

// Review with Codex
const review = await codexClient.execute('Review this code');

// Apply feedback with Claude
const fixed = await claudeClient.execute(`Apply: ${review.output}`, {
  sessionId: code.sessionId,
  resume: true,
});
```

### Example 6: Execution Logging

```typescript
const result = await client.execute('Create function', {
  logPath: './logs/execution-1',
});

// Logs are written to:
// - ./logs/execution-1/input.json
// - ./logs/execution-1/output.json
// - ./logs/execution-1/error.json (if error occurred)
```

### Example 7: Session with Logging

```typescript
const session = client.createSession({
  logPath: './logs/my-session',
});

await session.send('Message 1');  // Logs to ./logs/my-session/message-1/
await session.send('Message 2');  // Logs to ./logs/my-session/message-2/
```

### Example 8: Custom Adapter (Third-party CLI)

```typescript
import { BaseAdapter, type ExecutionResponse } from '@sourceborn/agent-cli-sdk-three';

class CustomAdapter extends BaseAdapter {
  async execute<T = string>(prompt: string, options = {}): Promise<ExecutionResponse<T>> {
    this.validatePrompt(prompt);
    this.validateOptions(options);

    // Custom CLI execution logic
    const result = await executeCustomCLI(this.cliPath, prompt, options);

    return parseCustomOutput(result);
  }

  getCapabilities() {
    return {
      streaming: true,
      sessionManagement: false,
      toolCalling: false,
      multiModal: false,
    };
  }
}

// Use custom adapter
const client = new AgentClient({ adapter: new CustomAdapter({ cliPath: '/path/to/cli' }) });
```

## Error Handling

The SDK provides specific error types for different failure modes:

```typescript
import {
  ValidationError,
  CLINotFoundError,
  AuthenticationError,
  ExecutionError,
  TimeoutError,
  ParseError,
  SessionError,
} from '@sourceborn/agent-cli-sdk-three';

try {
  const result = await client.execute('prompt');
} catch (error) {
  if (error instanceof CLINotFoundError) {
    console.error('CLI not found:', error.cliName);
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed for:', error.cliName);
  } else if (error instanceof TimeoutError) {
    console.error('Timeout after:', error.timeoutMs, 'ms');
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  }
}
```

## Testing

### Unit Tests

```bash
pnpm test
```

### Integration Tests

```bash
pnpm test:integration
```

### E2E Tests (requires real Claude CLI)

```bash
RUN_E2E_TESTS=true pnpm test:e2e
```

### Mock Adapter for Testing

```typescript
import { BaseAdapter } from '@sourceborn/agent-cli-sdk-three';

class MockAdapter extends BaseAdapter {
  async execute<T = string>(prompt: string): Promise<ExecutionResponse<T>> {
    return {
      output: 'Mock response' as T,
      sessionId: 'mock-123',
      status: 'success',
      exitCode: 0,
      duration: 100,
      metadata: {},
    };
  }

  getCapabilities() {
    return {
      streaming: false,
      sessionManagement: false,
      toolCalling: false,
      multiModal: false,
    };
  }
}

// Use in tests
const client = new AgentClient({ adapter: new MockAdapter({}) });
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Sourceborn](https://github.com/sourceborn)

## Related Projects

- [@sourceborn/agent-cli-sdk](https://github.com/sourceborn/agent-cli-sdk) - Original implementation
- [@spectora/agent-workflows](https://github.com/spectora/agent-workflows) - Workflow engine for AI agents

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Support

- [Issues](https://github.com/sourceborn/agent-cli-sdk/issues)
- [Discussions](https://github.com/sourceborn/agent-cli-sdk/discussions)
