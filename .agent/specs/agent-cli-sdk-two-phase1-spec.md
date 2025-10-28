# agent-cli-sdk-two Phase 1 Implementation Spec

**Status**: Ready for Implementation
**Phase**: 1 - Core Types & loadMessages for Claude
**Date**: 2025-10-27

---

## Overview

Build a simplified SDK for loading JSONL session files from AI CLI tools (Claude, Codex, Gemini, Cursor) into typed message arrays. Phase 1 focuses on Claude support with a unified message format that preserves native event data.

**Key Principles**:
- Unified interface with native format preservation
- Simple, type-safe API
- No session management complexity
- No batch operations
- JSON extraction/validation only for `execute()` (Phase 2)

---

## Folder Structure

```
packages/agent-cli-sdk-two/
├── src/
│   ├── index.ts                    # Main exports: loadMessages(), execute() [placeholder]
│   │
│   ├── types/
│   │   ├── index.ts                # Re-export all types
│   │   └── unified.ts              # UnifiedMessage interface
│   │
│   ├── claude/
│   │   ├── index.ts                # Export all Claude functions
│   │   ├── types.ts                # Claude native types
│   │   ├── parser.ts               # Parse JSONL → UnifiedMessage
│   │   └── loader.ts               # loadClaudeMessages()
│   │
│   ├── codex/
│   │   └── index.ts                # Placeholder stub
│   │
│   ├── gemini/
│   │   └── index.ts                # Placeholder stub
│   │
│   ├── cursor/
│   │   └── index.ts                # Placeholder stub
│   │
│   └── utils/
│       ├── errors.ts               # Error classes
│       └── jsonl.ts                # JSONL parsing utilities
│
└── tests/
    └── claude/
        ├── parser.test.ts
        ├── loader.test.ts
        └── fixtures/
            └── sample.jsonl        # Copy from mocks/claude/
```

**Why organize by tool (not cli/)?**
- Simpler imports: `from './claude/loader'` vs `from './cli/claude/loader'`
- Matches apps/web pattern
- Less nesting
- Future non-CLI sources can live alongside

---

## Type System

### Source Data

Reference file: `mocks/claude/1ba56c03-420b-4ee2-85fb-b4e5a26f9848.jsonl`

Sample Claude JSONL event:
```json
{
  "parentUuid": null,
  "isSidechain": false,
  "userType": "external",
  "cwd": "/Users/...",
  "sessionId": "1ba56c03-420b-4ee2-85fb-b4e5a26f9848",
  "version": "2.0.27",
  "gitBranch": "feat/...",
  "type": "user",
  "message": {
    "role": "user",
    "content": "Hello"
  },
  "uuid": "d37c4752-6f5a-43fa-90de-2d70989bf458",
  "timestamp": "2025-10-27T23:47:43.176Z"
}
```

### 1. Claude Native Types

**File**: `src/claude/types.ts`

```typescript
// Raw JSONL event from Claude CLI
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

// Message structure (nested in event)
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

// Content blocks
export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  thinking?: string;

  // For tool_result
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;

  // For tool_use
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

// Token usage
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

### 2. Unified Message Format

**File**: `src/types/unified.ts`

```typescript
export interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | UnifiedContent[];
  timestamp: number;
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';

  // Optional metadata
  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };

  // Native format preserved
  native: unknown; // Will be ClaudeEvent when tool === 'claude'
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

/**
 * Helper to extract text content from UnifiedMessage
 */
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

---

## Implementation

### 1. Claude Parser

**File**: `src/claude/parser.ts`

**Purpose**: Parse single JSONL line into UnifiedMessage

**Key Logic**:
1. Parse JSON line
2. Filter: only process `type: 'user' | 'assistant'` (skip `file-history-snapshot`)
3. Extract message from `event.message`
4. Normalize content to array format
5. Convert to unified format
6. Preserve original event in `native` field

```typescript
import type { UnifiedMessage, UnifiedContent } from '../types/unified';
import type { ClaudeEvent, ContentBlock } from './types';

/**
 * Parse Claude JSONL event into UnifiedMessage
 * Only processes 'user' and 'assistant' message events
 */
export function parseClaudeEvent(jsonlLine: string): UnifiedMessage | null {
  try {
    const event: ClaudeEvent = JSON.parse(jsonlLine);

    // Only process message events
    if (event.type !== 'user' && event.type !== 'assistant') {
      return null;
    }

    // Extract message
    const message = event.message;
    if (!message) {
      return null;
    }

    // Normalize content to array
    let content = message.content;
    if (typeof content === 'string') {
      content = [{ type: 'text', text: content }];
    }

    // Convert to unified content format
    const unifiedContent: UnifiedContent[] = (content as ContentBlock[]).map(block => {
      const unified: UnifiedContent = {
        type: block.type,
      };

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

    // Build unified message
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
    // Skip malformed lines
    return null;
  }
}
```

### 2. Claude Loader

**File**: `src/claude/loader.ts`

**Purpose**: Load JSONL file and parse all messages

**Key Logic**:
1. Resolve file path (absolute path or session ID)
2. Read file content
3. Split into lines
4. Parse each line with `parseClaudeEvent()`
5. Filter out null results
6. Sort chronologically by timestamp
7. Return empty array for ENOENT (like apps/web)

```typescript
import fs from 'fs/promises';
import type { UnifiedMessage } from '../types/unified';
import { parseClaudeEvent } from './parser';

export interface LoadClaudeMessagesOptions {
  sessionId: string;
  sessionDir?: string;
}

/**
 * Load Claude session messages from JSONL file
 */
export async function loadClaudeMessages(
  options: LoadClaudeMessagesOptions
): Promise<UnifiedMessage[]> {
  const { sessionId, sessionDir } = options;

  // Resolve file path
  // If sessionId contains '/' or ends in '.jsonl', treat as file path
  // Otherwise, look in default session directory
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
      return []; // Empty array for missing files
    }
    throw error;
  }
}

function getDefaultSessionDir(): string {
  return `${process.env.HOME}/.claude-code/sessions`;
}
```

### 3. Main API

**File**: `src/index.ts`

**Purpose**: Unified entry point for all tools

```typescript
import type { UnifiedMessage } from './types/unified';
import { loadClaudeMessages } from './claude/loader';

export interface LoadMessagesOptions {
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  sessionId: string;
  sessionDir?: string;
}

/**
 * Load messages from a session JSONL file
 */
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

/**
 * Execute CLI (placeholder for Phase 2)
 */
export async function execute(options: {
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  prompt: string;
  sessionId?: string;
  [key: string]: unknown;
}): Promise<unknown> {
  throw new Error('execute() not yet implemented - coming in Phase 2');
}

// Re-export types
export * from './types/unified';
export * from './claude/types';

// Re-export helpers
export { extractTextContent } from './types/unified';
```

### 4. Placeholder Stubs

**Files**: `src/codex/index.ts`, `src/gemini/index.ts`, `src/cursor/index.ts`

```typescript
export async function loadCodexMessages(): Promise<never> {
  throw new Error('Codex not yet implemented');
}
```

### 5. Exports

**File**: `src/claude/index.ts`

```typescript
export * from './types';
export * from './parser';
export * from './loader';
```

**File**: `src/types/index.ts`

```typescript
export * from './unified';
```

---

## Usage Examples

### Basic Loading from File Path

```typescript
import { loadMessages } from '@repo/agent-cli-sdk-two';

const messages = await loadMessages({
  tool: 'claude',
  sessionId: '/Users/you/mocks/claude/1ba56c03-420b-4ee2-85fb-b4e5a26f9848.jsonl'
});

console.log(messages.length);       // 50
console.log(messages[0].role);      // 'user'
console.log(messages[0].content);   // UnifiedContent[]
console.log(messages[0].tool);      // 'claude'
```

### Load by Session ID

```typescript
// Load from default location (~/.claude-code/sessions/)
const messages = await loadMessages({
  tool: 'claude',
  sessionId: '1ba56c03-420b-4ee2-85fb-b4e5a26f9848'
});

// Custom session directory
const messages2 = await loadMessages({
  tool: 'claude',
  sessionId: 'abc123',
  sessionDir: '/path/to/custom/sessions'
});
```

### Filter and Extract

```typescript
import { extractTextContent } from '@repo/agent-cli-sdk-two';

const messages = await loadMessages({
  tool: 'claude',
  sessionId: 'abc123'
});

// Get only assistant messages
const assistantMessages = messages.filter(m => m.role === 'assistant');

// Extract all text
const allText = messages
  .map(m => extractTextContent(m))
  .join('\n\n');

// Get messages with tool use
const toolMessages = messages.filter(m =>
  Array.isArray(m.content) &&
  m.content.some(block => block.type === 'tool_use')
);
```

### Access Native Format

```typescript
import type { ClaudeEvent } from '@repo/agent-cli-sdk-two';

const messages = await loadMessages({
  tool: 'claude',
  sessionId: 'abc123'
});

const firstMessage = messages[0];
if (firstMessage.tool === 'claude') {
  const nativeEvent = firstMessage.native as ClaudeEvent;
  console.log(nativeEvent.sessionId);
  console.log(nativeEvent.gitBranch);
  console.log(nativeEvent.cwd);
}
```

### Calculate Usage Statistics

```typescript
const messages = await loadMessages({
  tool: 'claude',
  sessionId: 'abc123'
});

// Total tokens
const totalTokens = messages.reduce((sum, msg) => {
  return sum + (msg.usage?.totalTokens || 0);
}, 0);

console.log(`Total tokens: ${totalTokens}`);

// Which models were used
const models = new Set(
  messages
    .filter(m => m.model)
    .map(m => m.model)
);

console.log('Models used:', Array.from(models));
```

---

## Testing Strategy

### Test Files

1. **`tests/claude/parser.test.ts`** - Unit tests for parseClaudeEvent()
   - Parse user message
   - Parse assistant message with usage
   - Parse message with tool use
   - Parse message with thinking
   - Skip file-history-snapshot events
   - Handle malformed JSON gracefully

2. **`tests/claude/loader.test.ts`** - Integration tests for loadClaudeMessages()
   - Load from file path
   - Load by session ID
   - Handle missing file (return empty array)
   - Sort messages chronologically
   - Filter out non-message events

3. **`tests/fixtures/sample.jsonl`** - Copy a few lines from mocks/claude/ for tests

### Test Data

Copy sample JSONL from: `mocks/claude/1ba56c03-420b-4ee2-85fb-b4e5a26f9848.jsonl`

Extract:
- 1-2 user messages
- 1-2 assistant messages
- 1 file-history-snapshot (should be filtered out)
- 1 message with tool use
- 1 message with usage data

---

## Error Handling

### Error Types

**File**: `src/utils/errors.ts`

```typescript
export class AgentSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentSDKError';
  }
}

export class FileNotFoundError extends AgentSDKError {
  constructor(public readonly filePath: string) {
    super(`Session file not found: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}
```

### Error Scenarios

| Scenario | Behavior |
|----------|----------|
| File not found (ENOENT) | Return empty array `[]` |
| Malformed JSON line | Skip line, continue parsing |
| Missing message in event | Skip event, return null |
| Invalid tool name | Throw error with exhaustive check |
| File read error (other) | Throw original error |

---

## Phase 1 Deliverables

### ✅ Implemented

- `loadMessages({ tool: 'claude', sessionId })` works
- Parse Claude JSONL into UnifiedMessage[]
- Unified format with native preservation
- Helper function `extractTextContent()`
- Placeholder stubs for codex/gemini/cursor
- Tests for parser and loader

### ❌ Not Implemented (Phase 2)

- `execute()` function
- JSON extraction from responses
- Zod schema validation
- CLI execution
- Codex/Gemini/Cursor loaders

---

## Implementation Checklist

- [ ] Create folder structure
- [ ] Define types in `src/types/unified.ts`
- [ ] Define types in `src/claude/types.ts`
- [ ] Implement `parseClaudeEvent()` in `src/claude/parser.ts`
- [ ] Implement `loadClaudeMessages()` in `src/claude/loader.ts`
- [ ] Implement `extractTextContent()` in `src/types/unified.ts`
- [ ] Wire up `loadMessages()` in `src/index.ts`
- [ ] Add placeholder `execute()` in `src/index.ts`
- [ ] Create placeholder stubs for codex/gemini/cursor
- [ ] Set up exports in `src/claude/index.ts`
- [ ] Set up exports in `src/types/index.ts`
- [ ] Set up main exports in `src/index.ts`
- [ ] Copy test fixtures from mocks/claude/
- [ ] Write parser tests
- [ ] Write loader tests
- [ ] Update package.json exports if needed
- [ ] Test with actual mock file

---

## Future Phases

### Phase 2: CLI Execution & JSON Extraction

- Implement `execute()` for Claude
- Add JSON extraction utilities
- Add Zod validation support
- Streaming support with callbacks

### Phase 3: Additional Tools

- Implement Codex loader and executor
- Implement Gemini loader and executor
- Implement Cursor loader and executor

### Phase 4: Advanced Features

- Batch operations (if needed)
- Session replay/resume (if needed)
- Performance optimizations

---

## Success Criteria

Phase 1 is complete when:

1. ✅ Can load Claude JSONL file into UnifiedMessage[]
2. ✅ All message types parsed correctly (user, assistant, tool_use, etc.)
3. ✅ Native format accessible via `message.native`
4. ✅ Helper functions work (`extractTextContent()`)
5. ✅ Tests pass with >80% coverage
6. ✅ Works with actual mock file from `mocks/claude/`
7. ✅ Other tools throw clear "not implemented" errors
8. ✅ TypeScript types are fully inferred
9. ✅ No runtime errors for valid JSONL files

---

## References

- Mock data: `mocks/claude/1ba56c03-420b-4ee2-85fb-b4e5a26f9848.jsonl`
- Existing implementation: `apps/web/src/server/agents/claude/`
- agent-cli-sdk v4: `packages/agent-cli-sdk/`
