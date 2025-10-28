# @repo/agent-cli-sdk-two

TypeScript SDK for orchestrating AI-powered CLI tools (Claude Code, OpenAI Codex) in development workflows.

## Features

- **Unified API** - Single interface for multiple AI CLI tools
- **Type-safe** - Full TypeScript support with strict typing
- **Session Management** - Load and parse AI CLI session histories
- **Execute Commands** - Run AI CLI tools programmatically with callbacks
- **JSON Extraction** - Automatically extract and parse JSON from AI responses
- **Cross-platform** - Works on macOS, Linux, and Windows

## Installation

```bash
# Using pnpm (recommended for monorepos)
pnpm add @repo/agent-cli-sdk-two

# Using npm
npm install @repo/agent-cli-sdk-two

# Using yarn
yarn add @repo/agent-cli-sdk-two
```

## Requirements

- Node.js >= 22.0.0
- Claude Code CLI (for Claude functionality)
- Optional: Zod (for enhanced type validation)

## Quick Start

### Execute a Claude Command

```typescript
import { execute } from '@repo/agent-cli-sdk-two';

const result = await execute({
  tool: 'claude',
  prompt: 'List all TypeScript files in the src directory',
  workingDir: '/path/to/project',
  verbose: true,
  onMessage: (message) => {
    console.log('Received message:', message);
  }
});

console.log('Final output:', result.output);
```

### Load Claude Session Messages

```typescript
import { loadMessages } from '@repo/agent-cli-sdk-two';

const messages = await loadMessages({
  tool: 'claude',
  sessionId: 'your-session-id',
  projectPath: '/path/to/project'
});

console.log(`Loaded ${messages.length} messages`);
messages.forEach(msg => {
  console.log(`[${msg.role}]:`, msg.content);
});
```

### Extract JSON from AI Responses

```typescript
import { execute } from '@repo/agent-cli-sdk-two';

interface PackageInfo {
  name: string;
  version: string;
  dependencies: string[];
}

const result = await execute<PackageInfo>({
  tool: 'claude',
  prompt: 'Analyze package.json and return JSON with name, version, and dependencies',
  extractJSON: true
});

if (result.extractedJSON) {
  console.log('Package name:', result.extractedJSON.name);
  console.log('Version:', result.extractedJSON.version);
}
```

## API Reference

### `execute(options)`

Execute an AI CLI command programmatically.

**Parameters:**

```typescript
interface ExecuteOptions {
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  prompt: string;
  workingDir?: string;
  timeout?: number;
  verbose?: boolean;
  extractJSON?: boolean;
  onMessage?: (message: UnifiedMessage) => void;
  onEvent?: (event: unknown) => void;
}
```

**Returns:** `Promise<ExecuteResult<T>>`

```typescript
interface ExecuteResult<T = unknown> {
  output: string;
  messages: UnifiedMessage[];
  extractedJSON?: T;
}
```

**Example:**

```typescript
const result = await execute({
  tool: 'claude',
  prompt: 'Create a new React component called Button',
  workingDir: './src/components',
  verbose: true,
  onMessage: (msg) => {
    if (msg.role === 'assistant') {
      console.log('AI:', msg.content);
    }
  }
});
```

### `loadMessages(options)`

Load messages from an AI CLI session.

**Parameters:**

```typescript
interface LoadMessagesOptions {
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  sessionId: string;
  projectPath?: string;
}
```

**Returns:** `Promise<UnifiedMessage[]>`

**Example:**

```typescript
const messages = await loadMessages({
  tool: 'claude',
  sessionId: 'abc123',
  projectPath: process.cwd()
});

// Filter for tool uses
const toolUses = messages.filter(msg =>
  msg.content.some(block => block.type === 'tool_use')
);
```

### `detectCli(options?)`

Detect the path to the Claude CLI executable.

**Parameters:**

```typescript
interface DetectCliOptions {
  customPath?: string;
}
```

**Returns:** `string | null`

**Example:**

```typescript
import { detectCli } from '@repo/agent-cli-sdk-two';

const cliPath = detectCli();
if (cliPath) {
  console.log('Claude CLI found at:', cliPath);
} else {
  console.error('Claude CLI not found');
}
```

### `extractJSON(text, schema?)`

Extract and parse JSON from text output.

**Parameters:**

```typescript
function extractJSON<T = unknown>(
  text: string,
  schema?: ZodSchema<T>
): T | null
```

**Returns:** Parsed JSON object or `null` if no valid JSON found

**Example:**

```typescript
import { extractJSON } from '@repo/agent-cli-sdk-two';
import { z } from 'zod';

const text = 'Here is the data: {"name": "John", "age": 30}';

// Without schema
const data = extractJSON(text);

// With Zod schema validation
const userSchema = z.object({
  name: z.string(),
  age: z.number()
});

const validatedData = extractJSON(text, userSchema);
```

## Types

### `UnifiedMessage`

Standardized message format across different AI tools:

```typescript
interface UnifiedMessage {
  role: 'user' | 'assistant';
  content: ContentBlock[];
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };
```

## Advanced Usage

### Permission Modes

Control how the CLI handles permission requests:

```typescript
import { execute } from '@repo/agent-cli-sdk-two';

const result = await execute({
  tool: 'claude',
  prompt: 'Refactor this code',
  permissionMode: 'acceptEdits', // Auto-approve edit operations
});
```

Available permission modes:
- `'accept'` - Accept all permissions automatically
- `'acceptEdits'` - Accept only file edit operations
- `'acceptTools'` - Accept only tool uses
- `'manual'` - Require manual approval (default)

### Custom CLI Path

Specify a custom path to the CLI executable:

```typescript
const result = await execute({
  tool: 'claude',
  prompt: 'Run tests',
  cliPath: '/custom/path/to/claude'
});
```

### Event Streaming

Monitor events in real-time:

```typescript
const result = await execute({
  tool: 'claude',
  prompt: 'Build the project',
  onEvent: (event) => {
    console.log('Event:', event);
  },
  onMessage: (message) => {
    console.log('Message:', message);
  }
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Type check
pnpm check-types

# Lint
pnpm lint

# Format code
pnpm format

# Run all checks
pnpm check
```

## Project Structure

```
agent-cli-sdk-two/
├── src/
│   ├── claude/          # Claude-specific implementation
│   │   ├── detectCli.ts
│   │   ├── execute.ts
│   │   ├── loadSession.ts
│   │   ├── parse.ts
│   │   └── types.ts
│   ├── utils/           # Shared utilities
│   │   ├── extractJson.ts
│   │   └── spawn.ts
│   ├── types/           # Type definitions
│   │   └── unified.ts
│   └── index.ts         # Main entry point
├── examples/            # Usage examples
├── tests/               # E2E tests and fixtures
├── scripts/             # Development scripts
└── dist/                # Build output (generated)
```

## Examples

See the [examples directory](./examples) for more usage examples:

- [Load Claude Session](./examples/loaders/load-claude-session.ts)

## Current Limitations

- **Claude Support Only**: Version 1.0.0 currently supports Claude Code CLI only
- **Node.js 22+**: Requires Node.js version 22.0.0 or higher
- **Platform Detection**: Automatic CLI detection works best on macOS and Linux

## Roadmap

- Support for OpenAI Codex
- Support for Google Gemini
- Support for Cursor AI
- Streaming response support
- Enhanced error handling and recovery
- CLI installation helpers

## Troubleshooting

### Claude CLI Not Found

If you get "Claude CLI not found" errors:

1. Install Claude Code: https://docs.anthropic.com/claude/docs/claude-code
2. Set the `CLAUDE_CLI_PATH` environment variable
3. Or specify `cliPath` in execute options

```bash
export CLAUDE_CLI_PATH=/path/to/claude
```

### Permission Errors

If you encounter permission issues:

1. Check that the working directory exists and is writable
2. Verify the Claude CLI has necessary permissions
3. Try using `permissionMode: 'accept'` for non-interactive execution

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass and code is properly formatted before submitting PRs.

```bash
pnpm check  # Run all checks
```
