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

## Requirements

- Node.js >= 22
- Claude Code CLI or OpenAI Codex CLI installed (depending on example)
- For interactive examples: TTY-capable terminal
