# agent-cli-sdk-two Full Implementation Plan

**Project**: Simplified SDK for AI CLI Tools (Claude, Codex, Gemini, Cursor)
**Status**: Planning Complete - Ready for Phased Implementation
**Date**: 2025-10-27

---

## Project Overview

Build a TypeScript SDK for:
1. **Loading** JSONL session files into typed message arrays
2. **Executing** AI CLI tools programmatically with type-safe options

**Key Principles**:
- Unified interface with native format preservation
- Simple, type-safe API: `loadMessages()` and `execute()`
- Tool-based organization (claude/, codex/, gemini/, cursor/)
- No session management complexity
- No batch operations
- JSON extraction/validation for `execute()` only

**Reference Mock Data**: `mocks/claude/1ba56c03-420b-4ee2-85fb-b4e5a26f9848.jsonl`

---

## Final Folder Structure

```
packages/agent-cli-sdk-two/
├── src/
│   ├── index.ts                    # Main exports
│   │
│   ├── types/
│   │   ├── index.ts                # Re-export all types
│   │   └── unified.ts              # UnifiedMessage interface
│   │
│   ├── claude/
│   │   ├── index.ts                # Export all Claude functions
│   │   ├── types.ts                # Claude native types
│   │   ├── parser.ts               # Parse JSONL → UnifiedMessage
│   │   ├── loader.ts               # loadClaudeMessages()
│   │   └── executor.ts             # executeClaudeCommand()
│   │
│   ├── codex/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── loader.ts
│   │   └── executor.ts
│   │
│   ├── gemini/
│   │   ├── index.ts                # Placeholder stubs
│   │   └── types.ts
│   │
│   ├── cursor/
│   │   ├── index.ts                # Placeholder stubs
│   │   └── types.ts
│   │
│   └── utils/
│       ├── errors.ts               # Error classes
│       ├── jsonl.ts                # JSONL parsing utilities
│       ├── json-extract.ts         # Extract & validate JSON
│       ├── spawn.ts                # Process spawning
│       └── cli-detector.ts         # Detect CLI paths
│
└── tests/
    ├── claude/
    │   ├── parser.test.ts
    │   ├── loader.test.ts
    │   ├── executor.test.ts
    │   └── fixtures/
    │       └── sample.jsonl
    ├── codex/
    │   ├── parser.test.ts
    │   └── loader.test.ts
    └── utils/
        └── json-extract.test.ts
```

---

# Phase 1: Core Types & Claude Loader

**Goal**: Load Claude JSONL files into typed message arrays

**Duration**: ~2-3 hours

**Deliverables**:
- ✅ UnifiedMessage type system
- ✅ Claude native types (from mock JSONL)
- ✅ Claude parser (JSONL → UnifiedMessage)
- ✅ Claude loader (read file, parse all messages)
- ✅ Main `loadMessages()` API
- ✅ Helper function `extractTextContent()`
- ✅ Placeholder stubs for other tools
- ✅ Tests with mock data

## Phase 1 Tasks

- [x] 1.1 Create Folder Structure
- [x] 1.2 Define Core Types
- [x] 1.3 Define Claude Types
- [x] 1.4 Implement Claude Parser
- [x] 1.5 Implement Claude Loader
- [x] 1.6 Wire Up Main API
- [x] 1.7 Create Placeholder Stubs
- [x] 1.8 Set Up Exports
- [x] 1.9 Copy Test Fixtures (used real file instead)
- [x] 1.10 Write Tests
- [x] 1.11 Test Build

#### Completion Notes
- All Phase 1 tasks completed successfully
- Tests are co-located with source files (per CLAUDE.md instructions)
- Used real Claude session file for testing instead of fixtures
- All 24 tests passing (parser and loader tests)
- Build successful with no TypeScript errors
- Package exports correctly configured

### 1.1 Create Folder Structure
```bash
mkdir -p src/types src/claude src/codex src/gemini src/cursor src/utils
mkdir -p tests/claude/fixtures tests/codex tests/utils
```

### 1.2 Define Core Types

**File**: `src/types/unified.ts`
```typescript
export interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | UnifiedContent[];
  timestamp: number;
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';

  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };

  native: unknown;
}

export interface UnifiedContent {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  thinking?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  isError?: boolean;
}

export function extractTextContent(message: UnifiedMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  return message.content
    .filter(block => block.type === 'text' && block.text)
    .map(block => block.text)
    .join('');
}
```

**File**: `src/types/index.ts`
```typescript
export * from './unified';
```

### 1.3 Define Claude Types

**File**: `src/claude/types.ts`
```typescript
export interface ClaudeEvent {
  type: 'user' | 'assistant' | 'file-history-snapshot';
  timestamp?: string;
  uuid?: string;
  sessionId?: string;
  parentUuid?: string | null;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  message?: ClaudeMessage;
  requestId?: string;
  isMeta?: boolean;
  userType?: 'external' | 'internal';
  isSidechain?: boolean;
  thinkingMetadata?: ThinkingMetadata;
  toolUseResult?: ToolUseResult;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  model?: string;
  id?: string;
  type?: 'message';
  stop_reason?: string | null;
  stop_sequence?: string | null;
  usage?: ClaudeUsage;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  thinking?: string;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
  service_tier?: string;
}

export interface ThinkingMetadata {
  level?: 'none' | 'low' | 'medium' | 'high';
  disabled?: boolean;
  triggers?: string[];
}

export interface ToolUseResult {
  type?: string;
  file?: {
    filePath: string;
    content: string;
    numLines: number;
    startLine: number;
    totalLines: number;
  };
  filePath?: string;
  oldString?: string;
  newString?: string;
}
```

### 1.4 Implement Claude Parser

**File**: `src/claude/parser.ts`
```typescript
import type { UnifiedMessage, UnifiedContent } from '../types/unified';
import type { ClaudeEvent, ContentBlock } from './types';

export function parseClaudeEvent(jsonlLine: string): UnifiedMessage | null {
  try {
    const event: ClaudeEvent = JSON.parse(jsonlLine);

    if (event.type !== 'user' && event.type !== 'assistant') {
      return null;
    }

    const message = event.message;
    if (!message) {
      return null;
    }

    let content = message.content;
    if (typeof content === 'string') {
      content = [{ type: 'text', text: content }];
    }

    const unifiedContent: UnifiedContent[] = (content as ContentBlock[]).map(block => {
      const unified: UnifiedContent = { type: block.type };
      if (block.text) unified.text = block.text;
      if (block.thinking) unified.thinking = block.thinking;
      if (block.name) unified.toolName = block.name;
      if (block.input) unified.toolInput = block.input;
      if (block.type === 'tool_result') {
        unified.toolResult = block.content;
        unified.isError = block.is_error;
      }
      return unified;
    });

    return {
      id: event.uuid || message.id || `${event.timestamp}-${event.type}`,
      role: message.role,
      content: unifiedContent,
      timestamp: event.timestamp ? new Date(event.timestamp).getTime() : Date.now(),
      tool: 'claude',
      model: message.model,
      usage: message.usage ? {
        inputTokens: message.usage.input_tokens || 0,
        outputTokens: message.usage.output_tokens || 0,
        totalTokens: (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0),
        cacheCreationTokens: message.usage.cache_creation_input_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens,
      } : undefined,
      native: event,
    };
  } catch {
    return null;
  }
}
```

### 1.5 Implement Claude Loader

**File**: `src/claude/loader.ts`
```typescript
import fs from 'fs/promises';
import type { UnifiedMessage } from '../types/unified';
import { parseClaudeEvent } from './parser';

export interface LoadClaudeMessagesOptions {
  sessionId: string;
  sessionDir?: string;
}

export async function loadClaudeMessages(
  options: LoadClaudeMessagesOptions
): Promise<UnifiedMessage[]> {
  const { sessionId, sessionDir } = options;

  const filePath = sessionId.includes('/') || sessionId.endsWith('.jsonl')
    ? sessionId
    : `${sessionDir || getDefaultSessionDir()}/${sessionId}.jsonl`;

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    const messages = lines
      .map(line => parseClaudeEvent(line))
      .filter((msg): msg is UnifiedMessage => msg !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    return messages;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function getDefaultSessionDir(): string {
  return `${process.env.HOME}/.claude-code/sessions`;
}
```

### 1.6 Wire Up Main API

**File**: `src/index.ts`
```typescript
import type { UnifiedMessage } from './types/unified';
import { loadClaudeMessages } from './claude/loader';

export interface LoadMessagesOptions {
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  sessionId: string;
  sessionDir?: string;
}

export async function loadMessages(
  options: LoadMessagesOptions
): Promise<UnifiedMessage[]> {
  switch (options.tool) {
    case 'claude':
      return await loadClaudeMessages(options);
    case 'codex':
      throw new Error('Codex loader not yet implemented');
    case 'gemini':
      throw new Error('Gemini loader not yet implemented');
    case 'cursor':
      throw new Error('Cursor loader not yet implemented');
    default:
      const _exhaustive: never = options.tool;
      throw new Error(`Unknown tool: ${_exhaustive}`);
  }
}

export async function execute(options: unknown): Promise<unknown> {
  throw new Error('execute() not yet implemented - coming in Phase 2');
}

export * from './types/unified';
export * from './claude/types';
export { extractTextContent } from './types/unified';
```

### 1.7 Create Placeholder Stubs

**File**: `src/codex/index.ts`
```typescript
export async function loadCodexMessages(): Promise<never> {
  throw new Error('Codex not yet implemented');
}
```

**File**: `src/gemini/index.ts`
```typescript
export async function loadGeminiMessages(): Promise<never> {
  throw new Error('Gemini not yet implemented');
}
```

**File**: `src/cursor/index.ts`
```typescript
export async function loadCursorMessages(): Promise<never> {
  throw new Error('Cursor not yet implemented');
}
```

### 1.8 Set Up Exports

**File**: `src/claude/index.ts`
```typescript
export * from './types';
export * from './parser';
export * from './loader';
```

### 1.9 Copy Test Fixtures

```bash
# Copy sample JSONL from mocks/
cp mocks/claude/1ba56c03-420b-4ee2-85fb-b4e5a26f9848.jsonl tests/claude/fixtures/sample.jsonl
```

### 1.10 Write Tests

**File**: `tests/claude/parser.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { parseClaudeEvent } from '../../src/claude/parser';

describe('parseClaudeEvent', () => {
  it('should parse user message', () => {
    const line = '{"type":"user","message":{"role":"user","content":"Hello"},"uuid":"123","timestamp":"2025-01-01T00:00:00Z"}';
    const result = parseClaudeEvent(line);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('user');
    expect(result?.tool).toBe('claude');
  });

  it('should skip file-history-snapshot', () => {
    const line = '{"type":"file-history-snapshot","messageId":"123"}';
    const result = parseClaudeEvent(line);
    expect(result).toBeNull();
  });
});
```

**File**: `tests/claude/loader.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { loadClaudeMessages } from '../../src/claude/loader';

describe('loadClaudeMessages', () => {
  it('should load messages from file', async () => {
    const messages = await loadClaudeMessages({
      sessionId: 'tests/claude/fixtures/sample.jsonl'
    });

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].tool).toBe('claude');
  });

  it('should return empty array for missing file', async () => {
    const messages = await loadClaudeMessages({
      sessionId: '/nonexistent/file.jsonl'
    });

    expect(messages).toEqual([]);
  });
});
```

### 1.11 Test Build

```bash
cd packages/agent-cli-sdk-two
pnpm build
pnpm test
```

## Phase 1 Success Criteria

- ✅ `loadMessages({ tool: 'claude', sessionId })` works
- ✅ Parse all message types (user, assistant, tool_use, thinking)
- ✅ Native format accessible via `message.native`
- ✅ `extractTextContent()` helper works
- ✅ Tests pass with >80% coverage
- ✅ Works with actual mock file
- ✅ Other tools throw clear errors
- ✅ TypeScript types fully inferred

---

# Phase 2: Claude Executor & JSON Extraction

**Goal**: Execute Claude CLI programmatically with JSON extraction/validation

**Duration**: ~3-4 hours

**Deliverables**:
- ✅ Claude executor (spawn CLI, parse output)
- ✅ JSON extraction utilities
- ✅ Zod validation support
- ✅ `execute()` API for Claude
- ✅ Streaming support with callbacks
- ✅ Tests for executor and JSON utilities

## Phase 2 Tasks

### 2.1 JSON Extraction Utilities

**File**: `src/utils/json-extract.ts`
```typescript
import type { z } from 'zod';

export class JSONExtractionError extends Error {
  constructor(message: string, public readonly rawText: string) {
    super(message);
    this.name = 'JSONExtractionError';
  }
}

export class JSONValidationError extends Error {
  constructor(
    message: string,
    public readonly data: unknown,
    public readonly zodError?: unknown
  ) {
    super(message);
    this.name = 'JSONValidationError';
  }
}

export function extractJSON(text: string): unknown {
  if (!text || typeof text !== 'string') {
    throw new JSONExtractionError('Invalid input: expected non-empty string', text);
  }

  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Continue
  }

  // Try markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (err) {
      throw new JSONExtractionError(
        `Failed to parse JSON from code block: ${err instanceof Error ? err.message : String(err)}`,
        text
      );
    }
  }

  // Try to find JSON in text
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch?.[0]) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      throw new JSONExtractionError(
        `Failed to parse extracted JSON: ${err instanceof Error ? err.message : String(err)}`,
        text
      );
    }
  }

  throw new JSONExtractionError('No valid JSON found in text', text);
}

export function extractAndValidateJSON<T>(
  text: string,
  schema: z.ZodSchema<T>
): T {
  const json = extractJSON(text);
  const result = schema.safeParse(json);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    throw new JSONValidationError(
      `JSON validation failed: ${errorDetails}`,
      json,
      result.error
    );
  }

  return result.data;
}
```

### 2.2 Process Spawning Utility

**File**: `src/utils/spawn.ts`
```typescript
import { spawn } from 'cross-spawn';

export interface SpawnOptions {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export async function spawnProcess(
  command: string,
  options: SpawnOptions
): Promise<SpawnResult> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const proc = spawn(command, options.args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | undefined;

    if (options.timeout) {
      timeoutId = setTimeout(() => {
        proc.kill();
        reject(new Error(`Process timeout after ${options.timeout}ms`));
      }, options.timeout);
    }

    proc.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      options.onStdout?.(text);
    });

    proc.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      options.onStderr?.(text);
    });

    proc.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);

      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
        duration: Date.now() - startTime,
      });
    });

    proc.on('error', (err) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });
  });
}
```

### 2.3 CLI Detector

**File**: `src/utils/cli-detector.ts`
```typescript
import { execSync } from 'child_process';

export function detectClaudeCLI(): string | null {
  // Check CLAUDE_CLI_PATH env var
  if (process.env.CLAUDE_CLI_PATH) {
    return process.env.CLAUDE_CLI_PATH;
  }

  // Try 'which claude'
  try {
    const result = execSync('which claude', { encoding: 'utf-8' });
    return result.trim();
  } catch {
    return null;
  }
}

export function detectCodexCLI(): string | null {
  if (process.env.CODEX_CLI_PATH) {
    return process.env.CODEX_CLI_PATH;
  }

  try {
    const result = execSync('which codex', { encoding: 'utf-8' });
    return result.trim();
  } catch {
    return null;
  }
}
```

### 2.4 Claude Executor

**File**: `src/claude/executor.ts`
```typescript
import type { z } from 'zod';
import type { UnifiedMessage } from '../types/unified';
import { spawnProcess } from '../utils/spawn';
import { detectClaudeCLI } from '../utils/cli-detector';
import { extractJSON, extractAndValidateJSON } from '../utils/json-extract';
import { parseClaudeEvent } from './parser';
import { extractTextContent } from '../types/unified';

export interface ExecuteClaudeOptions {
  prompt: string;
  sessionId?: string;
  workingDir?: string;
  timeout?: number;
  verbose?: boolean;

  // JSON extraction
  extractJSON?: boolean;
  responseSchema?: z.ZodSchema;

  // Callbacks
  onMessage?: (message: UnifiedMessage) => void;
  onEvent?: (event: unknown) => void;
}

export interface ExecuteClaudeResult<T = unknown> {
  messages: UnifiedMessage[];
  sessionId: string;
  output: string;
  exitCode: number;
  duration: number;
  data?: T;
}

export async function executeClaudeCommand<T = unknown>(
  options: ExecuteClaudeOptions
): Promise<ExecuteClaudeResult<T>> {
  const cliPath = detectClaudeCLI();
  if (!cliPath) {
    throw new Error('Claude CLI not found. Set CLAUDE_CLI_PATH or install Claude Code.');
  }

  // Build CLI args
  const args = [options.prompt];
  if (options.sessionId) {
    args.push('--session-id', options.sessionId);
  }

  // Spawn process
  let lineBuffer = '';
  const events: unknown[] = [];

  const result = await spawnProcess(cliPath, {
    args,
    cwd: options.workingDir,
    timeout: options.timeout || 60000,
    onStdout: (chunk) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line);
          events.push(event);
          options.onEvent?.(event);

          // Parse as message
          const message = parseClaudeEvent(line);
          if (message) {
            options.onMessage?.(message);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    },
  });

  // Parse all messages
  const messages = result.stdout
    .split('\n')
    .map(line => parseClaudeEvent(line))
    .filter((msg): msg is UnifiedMessage => msg !== null)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Extract session ID from first event
  const firstEvent = events[0] as any;
  const sessionId = options.sessionId || firstEvent?.sessionId || 'unknown';

  // Extract text output
  const output = messages
    .filter(m => m.role === 'assistant')
    .map(m => extractTextContent(m))
    .join('\n');

  // Extract JSON if requested
  let data: T | undefined;
  if (options.extractJSON || options.responseSchema) {
    const lastAssistant = messages.filter(m => m.role === 'assistant').at(-1);
    if (lastAssistant) {
      const text = extractTextContent(lastAssistant);
      data = options.responseSchema
        ? extractAndValidateJSON<T>(text, options.responseSchema)
        : extractJSON(text) as T;
    }
  }

  return {
    messages,
    sessionId,
    output,
    exitCode: result.exitCode,
    duration: result.duration,
    data,
  };
}
```

### 2.5 Update Main API

**File**: `src/index.ts` (add execute implementation)
```typescript
import type { z } from 'zod';
import { executeClaudeCommand, type ExecuteClaudeOptions, type ExecuteClaudeResult } from './claude/executor';

export interface ExecuteOptions {
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  prompt: string;
  sessionId?: string;
  workingDir?: string;
  timeout?: number;
  verbose?: boolean;
  extractJSON?: boolean;
  responseSchema?: z.ZodSchema;
  onMessage?: (message: UnifiedMessage) => void;
  onEvent?: (event: unknown) => void;
}

export async function execute<T = unknown>(
  options: ExecuteOptions
): Promise<ExecuteClaudeResult<T>> {
  switch (options.tool) {
    case 'claude':
      return await executeClaudeCommand<T>(options as ExecuteClaudeOptions);
    case 'codex':
      throw new Error('Codex executor not yet implemented');
    case 'gemini':
      throw new Error('Gemini executor not yet implemented');
    case 'cursor':
      throw new Error('Cursor executor not yet implemented');
    default:
      const _exhaustive: never = options.tool;
      throw new Error(`Unknown tool: ${_exhaustive}`);
  }
}

// Re-export JSON utilities
export { extractJSON, extractAndValidateJSON, JSONExtractionError, JSONValidationError } from './utils/json-extract';
```

### 2.6 Write Tests

**File**: `tests/utils/json-extract.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { extractJSON, extractAndValidateJSON, JSONExtractionError } from '../../src/utils/json-extract';
import { z } from 'zod';

describe('extractJSON', () => {
  it('should parse direct JSON', () => {
    const result = extractJSON('{"name":"Alice"}');
    expect(result).toEqual({ name: 'Alice' });
  });

  it('should extract from markdown code block', () => {
    const text = '```json\n{"name":"Bob"}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ name: 'Bob' });
  });

  it('should throw for no JSON', () => {
    expect(() => extractJSON('Hello world')).toThrow(JSONExtractionError);
  });
});

describe('extractAndValidateJSON', () => {
  const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('should validate valid JSON', () => {
    const result = extractAndValidateJSON('{"name":"Alice","age":30}', UserSchema);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('should throw for invalid JSON', () => {
    expect(() => {
      extractAndValidateJSON('{"name":"Alice"}', UserSchema);
    }).toThrow();
  });
});
```

## Phase 2 Success Criteria

- ✅ `execute({ tool: 'claude', prompt })` works
- ✅ Returns typed messages array
- ✅ JSON extraction works with `extractJSON: true`
- ✅ Zod validation works with `responseSchema`
- ✅ Streaming callbacks work (`onMessage`, `onEvent`)
- ✅ CLI detection works
- ✅ Tests pass

---

# Phase 3: Codex Support

**Goal**: Add full Codex support (loader + executor)

**Duration**: ~2-3 hours

**Deliverables**:
- ✅ Codex native types
- ✅ Codex parser
- ✅ Codex loader
- ✅ Codex executor
- ✅ Tests for Codex

## Phase 3 Tasks

### 3.1 Define Codex Types

**File**: `src/codex/types.ts`
```typescript
// Similar structure to Claude but with Codex-specific fields
export interface CodexEvent {
  type: 'thread.started' | 'turn.completed' | 'item.completed' | 'tool.started';
  timestamp?: number;
  data?: unknown;
}

// Add other Codex-specific types based on Codex JSONL format
```

### 3.2 Implement Codex Parser

**File**: `src/codex/parser.ts`
```typescript
// Similar to Claude parser but for Codex format
```

### 3.3 Implement Codex Loader

**File**: `src/codex/loader.ts`
```typescript
// Similar to Claude loader
```

### 3.4 Implement Codex Executor

**File**: `src/codex/executor.ts`
```typescript
// Similar to Claude executor
```

### 3.5 Update Main APIs

Update `loadMessages()` and `execute()` to support Codex

### 3.6 Write Tests

Similar test structure as Claude

## Phase 3 Success Criteria

- ✅ Codex loader works
- ✅ Codex executor works
- ✅ All APIs support `tool: 'codex'`
- ✅ Tests pass

---

# Phase 4: Polish & Documentation

**Goal**: Final touches, docs, examples

**Duration**: ~1-2 hours

**Deliverables**:
- ✅ README with examples
- ✅ API documentation
- ✅ Usage examples
- ✅ Error handling improvements
- ✅ Final tests and coverage

## Phase 4 Tasks

### 4.1 Write README

**File**: `packages/agent-cli-sdk-two/README.md`

Include:
- Installation
- Quick start
- API reference
- Examples
- Type safety features

### 4.2 Add Examples

**Directory**: `packages/agent-cli-sdk-two/examples/`

- Basic loading
- Executing with JSON extraction
- Streaming with callbacks
- Error handling

### 4.3 Improve Error Messages

Review all error messages for clarity

### 4.4 Final Testing

- Run all tests
- Test with real Claude/Codex CLIs
- Check TypeScript inference
- Verify examples work

## Phase 4 Success Criteria

- ✅ README is complete
- ✅ Examples work
- ✅ All tests pass
- ✅ >85% code coverage
- ✅ No TypeScript errors

---

# Future Enhancements (Optional)

**Not included in main phases**:

### Gemini & Cursor Support
- Define types
- Implement parsers/loaders/executors
- Add tests

### Advanced Features
- Session replay/resume
- Batch operations (if needed)
- Performance optimizations
- Streaming file parsing for large JSONL

### Developer Experience
- CLI tool for testing
- Interactive REPL
- Better error messages with suggestions

---

## Implementation Order

**Execute phases in this order**:

1. **Phase 1** (Foundation) - Must complete first
2. **Phase 2** (Execution) - Builds on Phase 1
3. **Phase 3** (Codex) - Can be done after Phase 2
4. **Phase 4** (Polish) - Final step

**Estimated Total Time**: 8-10 hours

---

## Testing Strategy

### Unit Tests
- Each parser function
- Each loader function
- JSON extraction utilities
- CLI detector

### Integration Tests
- Load real JSONL files
- Execute actual CLI commands (optional, requires CLIs installed)
- End-to-end workflows

### Type Tests
- Verify TypeScript inference
- Check discriminated unions work
- Ensure type guards work

---

## Success Metrics

Project is complete when:

1. ✅ All 4 phases done
2. ✅ Tests pass with >85% coverage
3. ✅ Works with real mock data
4. ✅ TypeScript types are perfect
5. ✅ README is comprehensive
6. ✅ Examples run without errors
7. ✅ No runtime errors for valid inputs
8. ✅ Clear error messages for invalid inputs

---

## Migration from agent-cli-sdk v4

**Key Differences**:

| Feature | v4 | v2 (this project) |
|---------|----|--------------------|
| API | Class-based adapters | Functional API |
| Session mgmt | Built-in | None (simpler) |
| Batch ops | Not supported | Not supported |
| JSON extraction | `responseSchema` | `extractJSON` + `responseSchema` |
| Loading sessions | Not supported | ✅ `loadMessages()` |
| Message format | Native only | Unified + Native |

**Migration Example**:
```typescript
// v4
const adapter = new ClaudeAdapter();
const result = await adapter.execute('Hello');

// v2
const result = await execute({ tool: 'claude', prompt: 'Hello' });
```

---

## Notes

- **Zod is a peer dependency** - Users must install it
- **CLI tools required** - Must have Claude/Codex installed
- **Node.js >= 22** - Required for package
- **ESM only** - No CommonJS support
