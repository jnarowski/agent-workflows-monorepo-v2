# Agent CLI SDK Examples

This directory contains examples demonstrating how to use the `agent-cli-sdk` package.

## Examples

### Loaders

- **[loaders/load-claude-session.ts](./loaders/load-claude-session.ts)** - Load and inspect messages from a saved Claude session

### Execute Command Examples

- **[basic-execute.ts](./basic-execute.ts)** - Simple example showing how to run a basic Claude command
- **[json-extraction.ts](./json-extraction.ts)** - Extract structured JSON data from Claude's responses
- **[streaming-callbacks.ts](./streaming-callbacks.ts)** - Process events and messages in real-time using callbacks
- **[session-continuation.ts](./session-continuation.ts)** - Maintain context across multiple executions using session IDs
- **[timeout-and-error-handling.ts](./timeout-and-error-handling.ts)** - Handle timeouts and errors gracefully (no exceptions thrown!)

## Running Examples

All examples are executable TypeScript files. You can run them directly with `tsx`:

```bash
# Run any example from the package root
tsx examples/basic-execute.ts

# Or make them executable and run directly
chmod +x examples/basic-execute.ts
./examples/basic-execute.ts
```

## Prerequisites

Make sure you have:

1. Claude CLI installed and configured
2. The `agent-cli-sdk` package built (`pnpm build`)
3. `tsx` installed (or use `ts-node`)

```bash
# Install tsx globally if needed
npm install -g tsx

# Or use with pnpm
pnpm install -g tsx
```

## API Overview

The new API uses a result-based pattern (no exceptions for timeouts/errors):

```typescript
import { execute } from '@repo/agent-cli-sdk';

const result = await execute({
  tool: 'claude',
  prompt: 'Your prompt here',
  json: true,        // Enable JSON extraction
  verbose: false,    // Hide spawn logging
  timeout: 60000,    // Timeout in milliseconds
  onEvent: ({ raw, event, message }) => {
    // Process events in real-time
  }
});

// Result structure
console.log(result.success);    // boolean - whether command succeeded
console.log(result.exitCode);   // number - process exit code
console.log(result.sessionId);  // string - Claude session ID
console.log(result.duration);   // number - execution time in ms
console.log(result.messages);   // UnifiedMessage[] - all messages
console.log(result.data);       // T | string - extracted data or text
console.log(result.error);      // string | undefined - error message if failed
```

## Key Features

### Result-Based Error Handling

The SDK doesn't throw exceptions for command failures or timeouts. Instead, check `result.success`:

```typescript
const result = await execute({ /* ... */ });

if (!result.success) {
  console.error('Command failed:', result.error);
  // Handle gracefully
}
```

### JSON Extraction

Use `json: true` to automatically parse JSON from responses:

```typescript
interface MyData { files: string[] }

const result = await execute<MyData>({
  prompt: 'List files as JSON',
  json: true
});

if (typeof result.data === 'object') {
  console.log(result.data.files); // Type-safe access
}
```

### Real-Time Events

Use `onEvent` callback to process events as they stream:

```typescript
await execute({
  prompt: 'Analyze code',
  onEvent: ({ raw, event, message }) => {
    if (message?.role === 'assistant') {
      // Handle assistant messages in real-time
    }
  }
});
```

### Session Continuation

Maintain context across multiple executions using session IDs and resume:

```typescript
import { randomUUID } from 'crypto';

// Create a session with a specific ID
const sessionId = randomUUID();

// First execution - creates new session
const result1 = await execute({
  prompt: 'My name is Tony',
  sessionId,
  tool: 'claude'
});

// Resume the session - Claude remembers previous context
const result2 = await execute({
  prompt: 'What is my name?',
  sessionId: result1.sessionId,
  resume: true, // Resume the existing session
  tool: 'claude'
});
// Claude will remember "Tony" from the previous message!

// Continue with more questions
const result3 = await execute({
  prompt: 'Spell my name backwards',
  sessionId: result2.sessionId,
  resume: true,
  tool: 'claude'
});
// All three executions share the same session context
```

## Example Output

Each example includes console output showing:

- The command being executed
- Real-time progress (if callbacks are used)
- Final results with success status, exit codes, and durations
- Error handling demonstrations (graceful, no exceptions)

## Creating Your Own Examples

Feel free to copy any example as a starting point for your own use cases. See the [main README](../README.md) for full API documentation.
