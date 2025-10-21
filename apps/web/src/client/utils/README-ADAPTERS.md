# Chat Format Adapters

## Overview

The adapter system allows us to load historical chat sessions from different JSONL formats without modifying the source files. This is useful when:
- Claude Code changes its output format
- Supporting different chatbot systems (Claude, Codex, etc.)
- Loading old conversation files

## Architecture

```
JSONL File → Auto-detect Format → Transform → Unified ChatMessage → UI Components
```

### Primary Use Case: WebSocket (Real-time)
```typescript
// Real-time messages - no adapter needed
useClaudeWebSocket(sessionId) → messages arrive pre-formatted → UI
```

### Secondary Use Case: Historical Sessions (JSONL)
```typescript
// Load old conversations - adapter transforms format
useClaudeSession(file) → adapter detects format → transforms → UI
```

## Supported Formats

### 1. Claude CLI Format (New)
**File**: `955542ae-9772-459d-a33f-d12f5586d961.jsonl`

**Structure**:
```jsonl
{"type":"user","message":{"role":"user","content":[...]},"uuid":"...","timestamp":"..."}
{"type":"assistant","message":{"role":"assistant","content":[...]},"uuid":"...","timestamp":"..."}
```

**Detection**: Looks for `"type":"user"` or `"type":"assistant"`

**Adapter**: `transformClaudeCliEvent()` in `sessionAdapters.ts`

### 2. Claude Streaming Format (Old)
**File**: `8f079ffe-995f-42ba-b089-84de56817b6f.jsonl`

**Structure**:
```jsonl
{"type":"message_start","message":{"id":"...","role":"assistant"}}
{"type":"content_block_start","content_block":{"type":"text","text":"..."}}
{"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
{"type":"message_stop"}
```

**Detection**: Looks for `"type":"message_start"` or `"type":"content_block_start"`

**Adapter**: Falls back to original parsing logic in `parseClaudeSession.ts`

## How It Works

### 1. Format Detection (Auto)
```typescript
// In sessionAdapters.ts
function detectFormat(jsonlContent: string): TransformFn {
  if (jsonlContent.includes('"type":"user"')) {
    return transformClaudeCliEvent; // New CLI format
  }
  return (event) => event; // Streaming format (passthrough)
}
```

### 2. Transform Function
```typescript
// Simple transform: raw event → normalized event or null
function transformClaudeCliEvent(event: any): any | null {
  if (!event.type || !['user', 'assistant'].includes(event.type)) {
    return null; // Skip non-message events
  }

  return {
    type: event.type === 'user' ? 'user_message' : 'assistant_message',
    id: event.uuid,
    role: event.type,
    content: event.message.content, // Already in right format
    timestamp: event.timestamp
  };
}
```

### 3. Parse with Adapter
```typescript
// In parseClaudeSession.ts
export function parseJSONLSession(jsonlContent: string): ChatMessage[] {
  // Try adapter-based parsing (handles CLI format)
  const adapterResult = parseJSONLWithAdapter(jsonlContent);
  if (adapterResult.length > 0) {
    return adapterResult;
  }

  // Fall back to streaming format parsing
  // ... existing streaming logic
}
```

## Adding a New Format

Want to support a new chatbot or format change? Here's how:

### Step 1: Create Transform Function
```typescript
// In sessionAdapters.ts
function transformCodexEvent(event: any): any | null {
  // Your detection logic
  if (!event.format === 'codex') return null;

  // Transform to normalized format
  return {
    type: event.role === 'user' ? 'user_message' : 'assistant_message',
    id: event.id,
    role: event.role,
    content: event.messages, // Map to our content structure
    timestamp: event.created_at
  };
}
```

### Step 2: Update Format Detection
```typescript
// In sessionAdapters.ts
function detectFormat(jsonlContent: string): TransformFn {
  // Check for Codex format
  if (jsonlContent.includes('"format":"codex"')) {
    return transformCodexEvent;
  }

  // Check for Claude CLI format
  if (jsonlContent.includes('"type":"user"')) {
    return transformClaudeCliEvent;
  }

  // Default to streaming
  return (event) => event;
}
```

### Step 3: Test
```typescript
// Create a test mock file
// apps/web/public/mocks/codex-session.jsonl

// Use in component
const { messages } = useClaudeSession('codex-session.jsonl');
```

That's it! The adapter will auto-detect and transform the format.

## Key Principles

1. **Never modify mock files** - Adapters transform them
2. **Keep transforms simple** - One function per format
3. **Auto-detect format** - No manual configuration
4. **Unified output** - All adapters produce `ChatMessage[]`
5. **WebSocket is primary** - Adapters only for historical sessions

## Files

- `sessionAdapters.ts` - Transform functions and auto-detection
- `parseClaudeSession.ts` - Main parsing logic (uses adapters)
- `useClaudeSession.ts` - Hook for loading JSONL files
- `types/chat.ts` - Unified `ChatMessage` interface

## Testing Both Formats

```typescript
// Test new format (default)
const { messages: newFormat } = useClaudeSession();

// Test old format
const { messages: oldFormat } = useClaudeSession('8f079ffe-995f-42ba-b089-84de56817b6f.jsonl');

// Both should render identically in the UI
```

## Future: WebSocket Hook

For real-time conversations, create a WebSocket hook (no adapter needed):

```typescript
// hooks/useClaudeWebSocket.ts
export function useClaudeWebSocket(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`/ws/session/${sessionId}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // Messages already in ChatMessage format
      setMessages(prev => [...prev, message]);
    };

    return () => ws.close();
  }, [sessionId]);

  return { messages, isConnected: true };
}
```

Components can then choose which hook to use:
```typescript
// For historical sessions
const { messages } = useClaudeSession('file.jsonl');

// For real-time chat
const { messages } = useClaudeWebSocket(sessionId);
```
