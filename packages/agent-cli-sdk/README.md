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
- `resume?: boolean` - Resume existing session (use with `sessionId`)
- `continue?: boolean` - Continue last session
- `timeout?: number` - Execution timeout in ms
- `onOutput?: (data: OutputData) => void` - Output callback
- `onEvent?: (event: ClaudeStreamEvent) => void` - Event callback
- `logPath?: string` - Path for logging input/output
- `responseSchema?: ZodSchema | true` - JSON extraction/validation
- `streaming?: boolean` - Enable streaming (default: true)
- `permissionMode?: 'ask' | 'acceptEdits' | 'acceptAll'` - Permission mode
- `dangerouslySkipPermissions?: boolean` - Skip all permissions (sets permissionMode to 'acceptEdits')
- `toolSettings?: { allowedTools?: string[], disallowedTools?: string[] }` - Tool filtering
- `images?: Array<{ path: string }>` - Attach images to prompt
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
- Similar to ClaudeAdapter with these Codex-specific additions:
- `dangerouslyBypassApprovalsAndSandbox?: boolean` - Skip approvals and sandbox
- `images?: string[]` - Image file paths
- `search?: boolean` - Enable search capability
- `resume?: boolean` - Resume session (use with `sessionId`)

### ExecutionResponse

```typescript
interface ExecutionResponse<T = string> {
  status: 'success' | 'error' | 'timeout'
  data: T                        // Parsed output (string or structured data)
  sessionId: string              // Session identifier
  exitCode: number               // Process exit code
  duration: number               // Execution time in ms
  events?: StreamEvent[]         // Parsed JSONL events
  actions?: ActionLog[]          // Tool usage and action logs
  metadata: {                    // Execution metadata
    model?: string
    tokensUsed?: number
    toolsUsed?: string[]
    filesModified?: string[]
    validation?: ValidationResult
  }
  usage?: TokenUsage             // Token usage stats
  modelUsage?: Record<string, ModelUsage>  // Per-model usage breakdown
  totalCostUSD?: number          // Total estimated cost
  raw?: {                        // Raw process output
    stdout: string
    stderr: string
  }
  error?: {                      // Error details (if status === 'error')
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
```

### Event Types

**Claude Events:**
- `ClaudeStreamEvent` - Union of all Claude event types
- Event types: `assistant`, `user`, `result`, plus synthetic events:
  - `turn.started` - Emitted when first assistant message arrives
  - `turn.completed` - Emitted when result event arrives
  - `text` - Emitted for text content blocks
  - `tool.started` - Emitted for tool_use blocks
  - `tool.completed` - Emitted for tool_result blocks
- Type guards: `isClaudeEvent()`, `isFileHistorySnapshotEvent()`, `isUserMessageEvent()`, `isAssistantMessageEvent()`

**Codex Events:**
- `CodexStreamEvent` - Union of all Codex event types
- Event types: `thread.started`, `turn.completed`, `item.completed`, etc.
- Type guards: `isCodexEvent()`, `isThreadStartedEvent()`, `isTurnCompletedEvent()`, etc.

**OutputData Interface:**
```typescript
interface OutputData {
  raw: string           // Raw stdout chunk
  events?: StreamEvent[] // Parsed JSONL events from this chunk
  text?: string         // Text content extracted from events
  accumulated: string   // All text accumulated so far
}
```

### Helper Functions

```typescript
// Get adapter by name (type-safe)
function getAdapter(name: 'claude', config?: ClaudeConfig): ClaudeAdapter
function getAdapter(name: 'codex', config?: CodexConfig): CodexAdapter
function getAdapter(name: 'cursor', config?: CursorConfig): CursorAdapter
function getAdapter(name: 'gemini', config?: GeminiConfig): GeminiAdapter

// JSON utilities
function extractJSON(text: string): any | null  // Extract first JSON object/array
function parseJSONL(text: string): any[]        // Parse newline-delimited JSON
function safeJSONParse(text: string, schema?: ZodSchema): any  // Parse with optional Zod validation

// Error classes
class AgentSDKError extends Error
class ValidationError extends AgentSDKError
class CLINotFoundError extends AgentSDKError
class AuthenticationError extends AgentSDKError
class ExecutionError extends AgentSDKError
class TimeoutError extends AgentSDKError
class ParseError extends AgentSDKError
class SessionError extends AgentSDKError
```

## Examples

See the [examples](./examples) directory for more:

### Basic Examples
- [examples/basic/claude.ts](./examples/basic/claude.ts) - Basic Claude usage
- [examples/basic/codex.ts](./examples/basic/codex.ts) - Basic Codex usage
- [examples/session-continuation.ts](./examples/session-continuation.ts) - Session management
- [examples/streaming.ts](./examples/streaming.ts) - Streaming patterns
- [examples/multi-agent.ts](./examples/multi-agent.ts) - Dynamic adapter selection
- [examples/typed-events.ts](./examples/typed-events.ts) - Type-safe event handling

### Advanced Examples
- [examples/advanced/structured-output.ts](./examples/advanced/structured-output.ts) - JSON validation with Zod
- [examples/advanced/dynamic-scoping-session.ts](./examples/advanced/dynamic-scoping-session.ts) - Dynamic session management
- [examples/advanced/interactive-relay.ts](./examples/advanced/interactive-relay.ts) - Interactive relay pattern
- [examples/advanced/websocket-server.ts](./examples/advanced/websocket-server.ts) - WebSocket integration

### Session Examples
- [examples/sessions/session-chat.ts](./examples/sessions/session-chat.ts) - Multi-turn chat session
- [examples/sessions/codex-session.ts](./examples/sessions/codex-session.ts) - Codex session management

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

## Development

### Setup
```bash
pnpm install
pnpm build
```

### Testing
```bash
pnpm test              # Run unit tests
pnpm test:watch        # Watch mode
pnpm check             # Run all checks (tests + types + lint)

# E2E tests (require real CLIs)
RUN_E2E_TESTS=true pnpm test:e2e         # All E2E tests
RUN_E2E_TESTS=true pnpm test:e2e:claude  # Claude only
RUN_E2E_TESTS=true pnpm test:e2e:codex   # Codex only
```

### Requirements
- Node.js >= 22.0.0
- pnpm (recommended)
- For E2E tests:
  - Claude Code CLI (from claude.ai/download)
  - OpenAI Codex CLI (from github.com/openai/openai-cli)

## Troubleshooting

### CLI Not Found
If you get a `CLINotFoundError`, ensure the CLI is installed and in your PATH, or set the environment variable:
```bash
export CLAUDE_CLI_PATH=/path/to/claude
export CODEX_CLI_PATH=/path/to/codex
```

Alternatively, pass `cliPath` in the adapter config:
```typescript
const claude = new ClaudeAdapter({
  cliPath: '/custom/path/to/claude'
});
```

### Session Management
- `sessionId` alone creates a new session with that ID
- `sessionId + resume: true` continues an existing session
- `continue: true` (Claude only) continues the last session
- These options are mutually exclusive

### Structured Output
- Use `responseSchema: true` to extract any JSON from output
- Use `responseSchema: ZodSchema` for validated, type-safe parsing
- Throws `ParseError` if JSON extraction or validation fails

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
