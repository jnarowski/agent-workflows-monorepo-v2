# Agent CLI SDK Migration Specification

## Overview

Migrate apps/web to use `@repo/agent-cli-sdk` types and functions directly throughout the codebase. Eliminate all transform functions and agent abstraction layers from both client and server. Consolidate message processing into a single enrichment step in sessionStore.

## Core Principles

1. **Use SDK types directly** - No custom type definitions for messages/content blocks
2. **Enrich messages once in sessionStore** - Single transform that nests tool_result into tool_use
3. **Eliminate all frontend Maps and lookups** - Components are dumb renderers
4. **No legacy aliases** - Complete migration, no gradual rollout

---

## Phase 1: SDK Enhancement

### 1.1 Add Missing Tool Input Type

**File**: `packages/agent-cli-sdk/src/types/unified.ts`

**Action**: Add `TaskToolInput` interface (currently only exists in apps/web)

```typescript
export interface TaskToolInput {
  prompt: string;
  description: string;
  subagent_type: string;
  model?: string;
  resume?: string;
}
```

**Rationale**: Ensure all tool types live in SDK as single source of truth

---

## Phase 2: Update Type System

### 2.1 Shared Message Types - Re-export from SDK

**File**: `apps/web/src/shared/types/message.types.ts`

**Action**: Replace all custom types with SDK re-exports

```typescript
// Re-export SDK types as primary types
export type {
  UnifiedMessage,
  UnifiedContent,
  UnifiedTextBlock,
  UnifiedThinkingBlock,
  UnifiedToolUseBlock,
  UnifiedToolResultBlock,
  UnifiedSlashCommandBlock
} from '@repo/agent-cli-sdk';

// Single UI extension for streaming state
import type { UnifiedMessage, UnifiedToolUseBlock } from '@repo/agent-cli-sdk';

export type UIMessage = UnifiedMessage & {
  isStreaming?: boolean;
};

// Extended tool block with nested result
export type EnrichedToolUseBlock = UnifiedToolUseBlock & {
  result?: {
    content: string;
    is_error?: boolean;
  };
};
```

**Result**: Only 2 new types (UIMessage, EnrichedToolUseBlock), everything else re-exported

### 2.2 Tool Types - Re-export from SDK

**File**: `apps/web/src/shared/types/tool.types.ts`

**Action**: Replace all tool input types with SDK re-exports

```typescript
// Re-export ALL tool input types from SDK
export type {
  BashToolInput,
  ReadToolInput,
  WriteToolInput,
  EditToolInput,
  GlobToolInput,
  GrepToolInput,
  TodoWriteToolInput,
  WebSearchToolInput,
  TaskToolInput,
  AskUserQuestionToolInput,
  ExitPlanModeToolInput,
} from '@repo/agent-cli-sdk';

// Re-export type guards
export {
  isBashTool,
  isReadTool,
  isWriteTool,
  isEditTool,
  isGlobTool,
  isGrepTool,
} from '@repo/agent-cli-sdk';
```

**Rationale**: SDK owns all type definitions, apps/web just re-exports for convenience

---

## Phase 3: Server-Side Migration

### 3.1 Replace Session Loading with SDK

**File**: `apps/web/src/server/services/agentSession.ts`

**Action**: Replace custom agent loaders with SDK function

**Before**:
```typescript
const agent = getAgent(agentType);
const messages = await agent.loadSession(sessionId, projectPath);
```

**After**:
```typescript
import { loadMessages } from '@repo/agent-cli-sdk';
const messages = await loadMessages({
  tool: agentType,
  sessionId,
  projectPath
});
```

### 3.2 Simplify WebSocket Execution

**File**: `apps/web/src/server/websocket.ts`

**Action**: Replace ClaudeAdapter with SDK execute function

**Before**:
```typescript
const adapter = new ClaudeAdapter({ workingDir });
await adapter.execute(message, {
  sessionId,
  onOutput: (data) => {
    socket.send({ type: `session.${sessionId}.stream_output`, data });
  }
});
```

**After**:
```typescript
import { execute } from '@repo/agent-cli-sdk';
await execute({
  tool: 'claude',
  prompt: message,
  workingDir: projectPath,
  sessionId,
  resume: true,
  images: imagePaths,
  onEvent: ({ message }) => {
    if (message) {
      socket.send({
        type: `session.${sessionId}.stream_output`,
        data: { message }
      });
    }
  }
});
```

**Changes**:
- Remove `ClaudeAdapter` import and active sessions Map tracking adapter instances
- Use SDK's `execute()` function directly (stateless)
- Simplify to direct function calls (no adapter lifecycle management)
- Keep temp image handling logic

### 3.3 Delete Server Agent Directory

**Action**: Delete `apps/web/src/server/agents/` (entire directory)

**Files removed**:
- `index.ts` - Agent registry
- `claude/loadSession.ts` - Custom JSONL loader
- `claude/parseFormat.ts` - Custom parser
- `claude/parseFormat.test.ts` - Parser tests
- `codex/`, `cursor/`, `gemini/` - Stub implementations

**Rationale**: SDK handles all JSONL parsing and message loading

---

## Phase 4: SessionStore Message Enrichment

### 4.1 Add Message Enrichment Function

**File**: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`

**Action**: Add enrichment function at top of file (outside store definition)

```typescript
import type { UnifiedMessage, UnifiedContent } from '@repo/agent-cli-sdk';
import type { UIMessage, EnrichedToolUseBlock } from '@/shared/types/message.types';

/**
 * Enrich messages by nesting tool_result blocks into their corresponding tool_use blocks
 * This is the ONLY transform on the frontend - happens once when loading messages
 *
 * Process:
 * 1. Build Map of tool_use_id → result from all tool_result blocks
 * 2. Nest results into corresponding tool_use blocks (by matching IDs)
 * 3. Filter out standalone tool_result blocks (now nested in tool_use)
 * 4. Add isStreaming: false to all loaded messages
 */
function enrichMessagesWithToolResults(messages: UnifiedMessage[]): UIMessage[] {
  // Step 1: Build lookup map of tool results
  const resultMap = new Map<string, { content: string; is_error?: boolean }>();

  for (const message of messages) {
    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'tool_result') {
          resultMap.set(block.tool_use_id, {
            content: typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content),
            is_error: block.is_error
          });
        }
      }
    }
  }

  // Step 2: Enrich tool_use blocks and filter out tool_result blocks
  return messages.map(msg => {
    if (!Array.isArray(msg.content)) {
      return { ...msg, isStreaming: false };
    }

    const enrichedContent = msg.content
      .map(block => {
        // Nest result into tool_use block
        if (block.type === 'tool_use') {
          const result = resultMap.get(block.id);
          return result ? { ...block, result } : block;
        }
        return block;
      })
      // Filter out standalone tool_result blocks (now nested in tool_use)
      .filter(block => block.type !== 'tool_result');

    return {
      ...msg,
      content: enrichedContent,
      isStreaming: false
    } as UIMessage;
  });
}
```

### 4.2 Update loadSession to Use Enrichment

**File**: Same file as 4.1

**Action**: Replace agent transform with enrichment function

**Before** (line ~169):
```typescript
// Transform messages using agent's transform function
const messages = agent.transformMessages(rawMessages);
```

**After**:
```typescript
// Enrich messages with nested tool results
const messages = enrichMessagesWithToolResults(rawMessages);
```

### 4.3 Update Type Annotations in SessionStore

**File**: Same file as 4.1

**Action**: Update all type references

- `SessionMessage` → `UIMessage`
- `ContentBlock` → `UnifiedContent`
- Update import statements

**Rationale**: Store now works with SDK types + UI extensions

---

## Phase 5: Eliminate Frontend Processing

### 5.1 Remove Map Building from ProjectSession

**File**: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`

**Action**: Delete entire toolResults useMemo (lines ~329-348)

**Before**:
```typescript
// Derive toolResults from messages
const toolResults = useMemo(() => {
  const results = new Map<string, { content: string; is_error?: boolean }>();

  if (!session?.messages) return results;

  for (const message of session.messages) {
    for (const block of message.content) {
      if (block.type === "tool_result") {
        const toolResultBlock = block as ToolResultBlock;
        results.set(toolResultBlock.tool_use_id, {
          content: toolResultBlock.content,
          is_error: toolResultBlock.is_error,
        });
      }
    }
  }

  return results;
}, [session?.messages]);
```

**After**: (deleted)

**Rationale**: Messages already have results nested in tool_use blocks

### 5.2 Remove toolResults Prop from ChatInterface

**File**: Same file as 5.1

**Action**: Remove toolResults from ChatInterface props

**Before**:
```typescript
<ChatInterface
  projectId={projectId}
  sessionId={sessionId}
  agent={session.agent}
  messages={session.messages}
  toolResults={toolResults}  // DELETE THIS
  isLoading={session.loadingState === 'loading'}
  error={errorObj}
  isStreaming={session.isStreaming}
  isLoadingHistory={isLoadingHistory}
/>
```

**After**:
```typescript
<ChatInterface
  projectId={projectId}
  sessionId={sessionId}
  agent={session.agent}
  messages={session.messages}
  isLoading={session.loadingState === 'loading'}
  error={errorObj}
  isStreaming={session.isStreaming}
  isLoadingHistory={isLoadingHistory}
/>
```

### 5.3 Update ChatInterface Component

**File**: `apps/web/src/client/pages/projects/sessions/components/ChatInterface.tsx`

**Action**: Remove agent abstraction and toolResults processing

**Changes**:
1. Remove `toolResults` from props interface (line ~20)
2. Remove `toolResults` from destructured props (line ~37)
3. Remove `getAgent()` call (lines ~47-49)
4. Import and use MessageList component directly

**Before**:
```typescript
interface ChatInterfaceProps {
  // ...
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
}

export function ChatInterface({
  // ...
  toolResults: _toolResults = new Map(),
  // ...
}: ChatInterfaceProps) {
  // Get agent renderer
  const agentImpl = getAgent(agent);
  const AgentMessageRenderer = agentImpl.MessageRenderer;

  // ... later
  return (
    <div className="chat-container max-w-4xl mx-auto px-4 py-8">
      <AgentMessageRenderer messages={messages} />
      <AgentLoadingIndicator isStreaming={isStreaming} />
      <div ref={messagesEndRef} />
    </div>
  );
}
```

**After**:
```typescript
import { MessageList } from './session/MessageList';

interface ChatInterfaceProps {
  // ... (no toolResults)
}

export function ChatInterface({
  // ... (no toolResults)
}: ChatInterfaceProps) {
  // No agent logic needed

  // ... later
  return (
    <div className="chat-container max-w-4xl mx-auto px-4 py-8">
      <MessageList messages={messages} />
      <AgentLoadingIndicator isStreaming={isStreaming} />
      <div ref={messagesEndRef} />
    </div>
  );
}
```

### 5.4 Create MessageList Component

**New File**: `apps/web/src/client/pages/projects/sessions/components/session/MessageList.tsx`

**Action**: Create simple list renderer (extracted from lib/agents logic)

```typescript
import type { UIMessage } from '@/shared/types/message.types';
import { MessageRenderer } from './claude/MessageRenderer';

interface MessageListProps {
  messages: UIMessage[];
}

/**
 * Simple list renderer for chat messages
 * No processing, just iterates and renders each message
 */
export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <MessageRenderer key={message.id} message={message} />
      ))}
    </div>
  );
}
```

### 5.5 Update MessageRenderer Component

**File**: `apps/web/src/client/pages/projects/sessions/components/session/claude/MessageRenderer.tsx`

**Action**: Remove toolResults prop and type imports

**Before**:
```typescript
import type { SessionMessage } from "@/shared/types/message.types";

interface MessageRendererProps {
  message: SessionMessage;
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
}

export function MessageRenderer({ message, toolResults }: MessageRendererProps) {
  // ...
  switch (message.role) {
    case 'assistant':
      return <AssistantMessage message={message} toolResults={toolResults} />;
    // ...
  }
}
```

**After**:
```typescript
import type { UIMessage } from "@/shared/types/message.types";

interface MessageRendererProps {
  message: UIMessage;
}

export function MessageRenderer({ message }: MessageRendererProps) {
  // ...
  switch (message.role) {
    case 'assistant':
      return <AssistantMessage message={message} />;
    // ...
  }
}
```

### 5.6 Update AssistantMessage Component

**File**: `apps/web/src/client/pages/projects/sessions/components/session/claude/AssistantMessage.tsx`

**Action**: Remove toolResults prop from interface and ContentBlockRenderer call

**Changes**:
- Remove `toolResults` from props interface
- Remove `toolResults` from ContentBlockRenderer call
- Update type imports (SessionMessage → UIMessage)

### 5.7 Update ContentBlockRenderer Component

**File**: `apps/web/src/client/pages/projects/sessions/components/session/claude/ContentBlockRenderer.tsx`

**Action**: Replace Map lookup with direct property access

**Before**:
```typescript
import type { ContentBlock, ToolResultBlock } from "@/shared/types/message.types";

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
}

export function ContentBlockRenderer({ blocks, toolResults }: ContentBlockRendererProps) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "tool_use": {
        const result = toolResults?.get(block.id);  // ← Map lookup
        return (
          <ToolBlockRenderer
            key={`${block.id}-${index}`}
            toolName={block.name}
            input={block.input}
            result={result}
          />
        );
      }
      // ...
    }
  });
}
```

**After**:
```typescript
import type { UnifiedContent } from '@repo/agent-cli-sdk';
import type { EnrichedToolUseBlock } from "@/shared/types/message.types";

interface ContentBlockRendererProps {
  blocks: UnifiedContent[];
}

export function ContentBlockRenderer({ blocks }: ContentBlockRendererProps) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "tool_use": {
        const enrichedBlock = block as EnrichedToolUseBlock;
        return (
          <ToolBlockRenderer
            key={`${block.id}-${index}`}
            toolName={block.name}
            input={block.input}
            result={enrichedBlock.result}  // ← Direct property access
          />
        );
      }
      // ...
    }
  });
}
```

### 5.8 Delete Client Agent Directory

**Action**: Delete `apps/web/src/client/lib/agents/` (entire directory)

**Files removed**:
- `index.tsx` - Agent registry with Map building logic
- `claude/transformMessages.ts` - System message filtering
- `claude/transformStreaming.ts` - WebSocket transform
- `codex/`, `cursor/`, `gemini/` - Stub implementations
- `__mocks__/index.tsx` - Test mocks

**Rationale**: All agent-specific logic eliminated, components work with SDK types directly

---

## Phase 6: WebSocket Simplification

### 6.1 Update WebSocket Hook

**File**: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

**Action**: Remove agent transforms, use SDK messages directly

**Changes**:
1. Remove `getAgent()` call
2. Remove `transformStreaming()` call
3. Update handlers to use SDK message structure directly

**Before**:
```typescript
const handleStreamOutput = (data: SessionStreamOutputData) => {
  const session = useSessionStore.getState().session;
  if (!session) return;

  const agent = getAgent(session.agent);
  const streamingMessage = agent.transformStreaming(data);

  if (streamingMessage) {
    useSessionStore.getState().updateStreamingMessage(
      streamingMessage.id,
      streamingMessage.content
    );
  }
};
```

**After**:
```typescript
import type { UnifiedMessage, UnifiedContent } from '@repo/agent-cli-sdk';

const handleStreamOutput = (data: { message?: UnifiedMessage }) => {
  // SDK already provides clean UnifiedMessage
  if (data.message) {
    const msg = data.message;
    useSessionStore.getState().updateStreamingMessage(
      msg.id,
      msg.content as UnifiedContent[]
    );
  }
};
```

**Rationale**: SDK provides messages in final format, no client-side transforms needed

---

## Phase 7: Add Slash Command Rendering

### 7.1 Create SlashCommandBlock Component

**New File**: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/SlashCommandBlock.tsx`

**Action**: Create new component for rendering slash command blocks

```typescript
import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';

interface SlashCommandBlockProps {
  command: string;
  message?: string;
  args?: string;
}

/**
 * Renders slash command execution blocks
 * SDK extracts these from user messages with <command-name> tags
 */
export function SlashCommandBlock({ command, message, args }: SlashCommandBlockProps) {
  return (
    <ToolCollapsibleWrapper
      toolName={`/${command}`}
      contextInfo={args}
      description={message || 'Running slash command'}
    >
      <div className="space-y-2 text-sm font-mono">
        <div className="text-muted-foreground">
          Command: <span className="text-foreground">/{command}</span>
          {args && <span className="text-foreground ml-2">{args}</span>}
        </div>
        {message && (
          <div className="text-xs text-muted-foreground border-l-2 pl-2">
            {message}
          </div>
        )}
      </div>
    </ToolCollapsibleWrapper>
  );
}
```

### 7.2 Update ContentBlockRenderer

**File**: `apps/web/src/client/pages/projects/sessions/components/session/claude/ContentBlockRenderer.tsx`

**Action**: Add case for slash_command blocks

**Add import**:
```typescript
import { SlashCommandBlock } from './blocks/SlashCommandBlock';
```

**Add case in switch statement**:
```typescript
case "slash_command":
  return (
    <SlashCommandBlock
      key={`${index}-slash`}
      command={block.command}
      message={block.message}
      args={block.args}
    />
  );
```

**Rationale**: SDK automatically extracts slash commands, we just need to render them

---

## Phase 8: Update Component Type Annotations

### 8.1 Tool Block Components

**Files**: All files in `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/`

**Action**: Update type imports in all tool block components

**Changes**:
- Import tool input types from `@/shared/types/tool.types` (which re-exports from SDK)
- No logic changes needed - types are compatible

**Example** (BashToolBlock.tsx):
```typescript
// Before
import type { BashToolInput } from "@/shared/types/tool.types";

// After (same, but now re-exported from SDK)
import type { BashToolInput } from "@/shared/types/tool.types";
```

**Rationale**: Tool blocks already work correctly, just updating import source

---

## Phase 9: Cleanup Unused Utilities

### 9.1 Delete Orphaned Client Utilities

**Action**: Delete unused utility files identified during codebase analysis

**Files to delete**:
1. `apps/web/src/client/pages/projects/sessions/utils/parseClaudeSession.ts`
2. `apps/web/src/client/pages/projects/sessions/utils/sessionAdapters.ts`

**Rationale**:
- These utilities are **NOT imported or used anywhere** in the codebase
- Only `parseClaudeSession.ts` imports `sessionAdapters.ts` (circular unused dependency)
- Server now handles all JSONL parsing via `@/server/agents/claude/parseFormat.ts`
- Client receives pre-parsed `SessionMessage[]` from API
- These were likely replaced during architecture refactoring but never removed

**Architecture Note**:
- **Current flow**: Server parses JSONL → API returns typed messages → Client renders
- **Old flow (unused)**: Client parsed JSONL directly (these utilities were for that)

### 9.2 Verify No Breaking Changes

**Action**: Confirm deletions don't break anything

**Checks**:
1. Run `pnpm --filter web check-types` after deletion
2. Search for any dynamic imports or runtime references
3. Check test files don't import these utilities

**Expected**: No TypeScript errors, no broken imports

---

## Appendix: Comprehensive Codebase Analysis

### Files Affected by Type Migration (40+ files analyzed)

#### SessionMessage Type Usage (29 files)
- **Server**: 9 files (services, agents, routes)
- **Client**: 15 files (stores, components, hooks)
- **Shared**: 5 files (type definitions, websocket, chat)

#### ContentBlock Type Usage (17 files)
- **Client Components**: 11 files
- **Transform Functions**: 5 files (all deleted)
- **Server**: 1 file (parseFormat.ts - deleted)

#### ToolResultBlock Type Usage (4 files)
- Critical: `ProjectSession.tsx` (Map building - deleted)
- Components: `UserMessage.tsx`, `ContentBlockRenderer.tsx`

#### ClaudeAdapter Usage (4 files)
- Critical: `websocket.ts` (replaced with SDK execute)
- Documentation references

#### getAgent() Function Usage (8 files)
- **Client**: 6 files (stores, hooks, components)
- **Server**: 2 files (services, agent registry)

#### toolResults Map Usage (6 files)
- Full prop chain from ProjectSession → ChatInterface → MessageRenderer → AssistantMessage → ContentBlockRenderer

#### Transform Functions (15 files - ALL deleted)
- `transformMessages`: 7 files
- `transformStreaming`: 8 files

### Files NOT in Original Spec

**Confirmed Unused** (safe to delete):
- `parseClaudeSession.ts` - Not imported anywhere
- `sessionAdapters.ts` - Only imported by parseClaudeSession.ts

**Keep** (actively used or unrelated):
- `websocket.ts` - Does NOT use SessionMessage, independent types
- `chat.ts` - Central type export hub (17+ imports)
- `claude-session.types.ts` - Re-exported by chat.ts

---

## Success Criteria

### Functionality
- ✅ All sessions load and display correctly with SDK types
- ✅ WebSocket streaming works without transforms
- ✅ All tool blocks render (Bash, Read, Write, Edit, Glob, Grep, etc.)
- ✅ Tool results display correctly (nested in tool_use blocks)
- ✅ Slash commands appear as distinct blocks
- ✅ Error states show correctly (isError flag)
- ✅ Token counting displays usage data

### Code Quality
- ✅ No references to `lib/agents` directory
- ✅ No transform functions in client or server
- ✅ No Map building in components
- ✅ Type safety maintained throughout
- ✅ All imports from SDK or re-exports

### Testing
- ✅ Unit tests pass
- ✅ E2E flows work (load session, send message, streaming)
- ✅ No TypeScript errors
- ✅ No console errors in browser

---

## Impact Summary

### Files Modified: ~15
1. `packages/agent-cli-sdk/src/types/unified.ts` - Add TaskToolInput
2. `apps/web/src/shared/types/message.types.ts` - Re-export SDK types
3. `apps/web/src/shared/types/tool.types.ts` - Re-export SDK types
4. `apps/web/src/server/services/agentSession.ts` - Use SDK loadMessages
5. `apps/web/src/server/websocket.ts` - Use SDK execute
6. `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` - Add enrichMessages
7. `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx` - Remove Map
8. `apps/web/src/client/pages/projects/sessions/components/ChatInterface.tsx` - Remove agent logic
9. `apps/web/src/client/pages/projects/sessions/components/session/claude/MessageRenderer.tsx` - Remove toolResults
10. `apps/web/src/client/pages/projects/sessions/components/session/claude/AssistantMessage.tsx` - Remove toolResults
11. `apps/web/src/client/pages/projects/sessions/components/session/claude/ContentBlockRenderer.tsx` - Direct property access
12. `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Direct updates
13-15. Tool block components - Update type imports

### Files Created: 2
1. `apps/web/src/client/pages/projects/sessions/components/session/MessageList.tsx`
2. `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/SlashCommandBlock.tsx`

### Files Deleted: ~27
1. `apps/web/src/server/agents/` (entire directory ~10 files)
2. `apps/web/src/client/lib/agents/` (entire directory ~15 files)
3. `apps/web/src/client/pages/projects/sessions/utils/parseClaudeSession.ts` (orphaned utility)
4. `apps/web/src/client/pages/projects/sessions/utils/sessionAdapters.ts` (orphaned utility)

### Net Impact
- **Files**: 40+ analyzed, ~27 deleted, 2 created, ~15 modified
- **Lines of Code**: ~800 lines removed, ~200 lines added
- **New Exported Types**: 2 (UIMessage, EnrichedToolUseBlock)
- **Frontend Transforms**: 1 (enrichMessagesWithToolResults in sessionStore)
- **Component Maps/Lookups**: 0 (eliminated)
- **Orphaned Code Removed**: 2 unused utility files

### Architecture
**Before**:
```
SDK → Server agents → API → Client agents → sessionStore → ProjectSession (Map) → ChatInterface → Components
```

**After**:
```
SDK → Server API → sessionStore (enrich) → ProjectSession → ChatInterface → Components
```

**Processing Summary**:
- **SDK**: Provides pure UnifiedMessage[]
- **Server**: No transforms, passes SDK data through
- **sessionStore**: ONE transform (enrichMessagesWithToolResults)
- **Components**: Dumb renderers, no Maps or lookups

---

## Implementation Strategy

### Phase-by-Phase Verification Approach

Based on user preferences, we'll use a **phase-by-phase with verification** strategy:

1. **Complete Phase 1** → Run `pnpm --filter @repo/agent-cli-sdk build` + `pnpm check-types`
2. **Complete Phase 2** → Run `pnpm --filter web check-types`
3. **Complete Phase 3** → Run `pnpm --filter web check-types` + quick compilation check
4. **Complete Phase 4** → Run `pnpm --filter web check-types`
5. **Complete Phase 5** → Run `pnpm --filter web check-types`
6. **Complete Phase 6** → Run `pnpm --filter web check-types`
7. **Complete Phase 7** → Run `pnpm --filter web check-types`
8. **Complete Phase 8** → Run `pnpm --filter web check-types`
9. **Complete Phase 9** → Run `pnpm turbo build` (full build verification)

### Type Safety First

- Run type checking after each phase to catch issues early
- Fix any TypeScript errors before proceeding to next phase
- This prevents cascading type errors across phases

### Comprehensive Search Completed

✅ All 40+ affected files identified and documented in Appendix
✅ Unused utilities found and marked for deletion
✅ All type usage patterns mapped
✅ All import dependencies verified

### Risk Mitigation

- **Trust the spec**: Per user direction, we proceed with deletions as documented
- **No surprises**: Comprehensive search revealed no hidden dependencies
- **Clean slate**: Unused code removal (2 orphaned utilities) simplifies codebase
- **Type safety**: TypeScript will catch any missed references during verification
