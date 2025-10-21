# Feature: Chat UI with AI SDK Elements

## What We're Building

A modern chat interface using AI SDK Elements to display Claude conversations with interactive tool calls, collapsible thinking blocks, and syntax-highlighted code diffs. The UI is designed to seamlessly integrate with `@repo/agent-cli-sdk`'s event system, parsing JSONL session data for the prototype and ready for real-time WebSocket streaming in future iterations.

## User Story

As a developer managing AI agent workflows
I want to view and interact with Claude conversation history in a clean, scannable interface
So that I can understand what the agent did, review tool calls and code changes, and track the conversation flow without visual clutter

## Technical Approach

**Frontend Architecture:**
- Use AI SDK Elements component library (built on shadcn/ui) for consistent chat UI patterns
- Parse JSONL session files into typed messages matching `agent-cli-sdk` event format
- Implement block-level streaming (not character-by-character) aligned with SDK's event model
- Create specialized renderers for different tool types (Edit, Write, Read, Bash)
- Use collapsible components to reduce visual clutter for code blocks and thinking blocks

**Data Flow (Current - Mock Data):**
1. Fetch JSONL file from `/mocks/` directory
2. Parse events into `ChatMessage[]` with typed content blocks
3. Render messages with specialized components per content block type
4. Handle tool call linking (tool_use → tool_result matching)

**Data Flow (Future - Real-time):**
1. WebSocket connection to Fastify backend
2. Backend spawns `agent-cli-sdk` session with `onEvent` callback
3. Forward SDK events to client via WebSocket
4. Client parses events and updates message state in real-time

**Key Design Decisions:**
- Match `agent-cli-sdk`'s event types exactly (no custom mapping layer needed)
- Use shadcn/ui components for consistency with existing app design system
- Collapse tool details and long code blocks by default for scannability
- Provide specialized renderers for common tools (Edit shows diffs, Write shows new file content)
- Support dark mode throughout

## Files to Touch

### Existing Files

- `apps/web/package.json` - Add dependencies: ai-elements, diff, react-markdown, remark-gfm, shiki
- `apps/web/src/client/pages/ProjectDetail.tsx` - Replace "Chat content coming soon..." with ChatInterface component
- `apps/web/public/mocks/` - Copy JSONL mock session file for development

### New Files

**Types:**
- `apps/web/src/shared/types/chat.ts` - TypeScript types for messages, content blocks, tool calls (aligned with agent-cli-sdk)

**Utilities:**
- `apps/web/src/client/utils/parseClaudeSession.ts` - Parse JSONL into ChatMessage array
- `apps/web/src/client/utils/syntaxHighlighter.tsx` - Shiki-based syntax highlighting wrapper
- `apps/web/src/client/utils/getLanguageFromPath.ts` - Infer language from file extension

**Hooks:**
- `apps/web/src/client/hooks/useClaudeSession.ts` - Load and parse JSONL mock data

**Components (Chat):**
- `apps/web/src/client/components/chat/ChatInterface.tsx` - Main chat container with message list
- `apps/web/src/client/components/chat/MessageRenderer.tsx` - Routes to UserMessage or AssistantMessage
- `apps/web/src/client/components/chat/UserMessage.tsx` - User message bubble (right-aligned)
- `apps/web/src/client/components/chat/AssistantMessage.tsx` - Assistant message with avatar
- `apps/web/src/client/components/chat/ContentBlockRenderer.tsx` - Routes to TextBlock, ThinkingBlock, or ToolUseBlock
- `apps/web/src/client/components/chat/TextBlock.tsx` - Markdown-rendered text content
- `apps/web/src/client/components/chat/ThinkingBlock.tsx` - Collapsible reasoning display
- `apps/web/src/client/components/chat/ToolUseBlock.tsx` - Collapsible tool call with input/output
- `apps/web/src/client/components/chat/DiffViewer.tsx` - Side-by-side file diff display
- `apps/web/src/client/components/chat/CodeBlock.tsx` - Syntax-highlighted code with copy button
- `apps/web/src/client/components/chat/FileReference.tsx` - Clickable file path badge
- `apps/web/src/client/components/chat/ChatSkeleton.tsx` - Loading skeleton

**Components (Tool Renderers):**
- `apps/web/src/client/components/chat/tools/ToolInputRenderer.tsx` - Routes to tool-specific renderers
- `apps/web/src/client/components/chat/tools/ToolResultRenderer.tsx` - Display tool result or error
- `apps/web/src/client/components/chat/tools/EditToolRenderer.tsx` - Show file path + diff view
- `apps/web/src/client/components/chat/tools/WriteToolRenderer.tsx` - Show file path + new content
- `apps/web/src/client/components/chat/tools/ReadToolRenderer.tsx` - Show file reference
- `apps/web/src/client/components/chat/tools/BashToolRenderer.tsx` - Show command + output

## Implementation Plan

### Phase 1: Foundation

Set up dependencies, type definitions, and utilities for parsing JSONL session data into typed messages matching agent-cli-sdk's event format.

**Key Work:**
- Install AI SDK Elements via npx (adds to components/ai-elements/)
- Add syntax highlighting, markdown, and diff libraries
- Define TypeScript types aligned with agent-cli-sdk StreamEvent and content blocks
- Create JSONL parser that handles assistant/user messages and links tool results
- Build utility functions for language detection and syntax highlighting

### Phase 2: Core Implementation

Build the chat interface components, message renderers, and specialized tool displays.

**Key Work:**
- Main ChatInterface with auto-scrolling message list
- User/Assistant message components with proper styling
- ContentBlockRenderer that routes to Text, Thinking, or ToolUse blocks
- Collapsible ThinkingBlock for reasoning display
- ToolUseBlock with expandable input/output sections
- Tool-specific renderers (Edit, Write, Read, Bash)
- DiffViewer for file changes
- CodeBlock with syntax highlighting and copy button

### Phase 3: Integration

Connect chat UI to ProjectDetail page, add polish, and prepare architecture for future WebSocket integration.

**Key Work:**
- Copy mock JSONL file to public directory
- Integrate ChatInterface into ProjectDetail chat tab
- Add loading states and empty states
- Test with mock data across different tool types
- Verify dark mode support
- Document WebSocket integration pattern for future implementation

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Dependencies & Setup

<!-- prettier-ignore -->
- [ ] 1.1 Install AI SDK Elements
        - Run: `cd apps/web && npx ai-elements@latest`
        - Select components: Message, Conversation, Code (if prompted)
        - Components will be added to `apps/web/src/client/components/ai-elements/`
- [ ] 1.2 Install additional dependencies
        - Run: `pnpm add --filter @repo/web diff react-markdown remark-gfm shiki`
        - Verify installation: `cd apps/web && pnpm list diff react-markdown remark-gfm shiki`
- [ ] 1.3 Copy mock session file to public directory
        - Run: `mkdir -p apps/web/public/mocks`
        - Run: `cp mocks/8f079ffe-995f-42ba-b089-84de56817b6f.jsonl apps/web/public/mocks/`
        - Verify: `ls -la apps/web/public/mocks/`

#### Completion Notes

### 2: Type Definitions

<!-- prettier-ignore -->
- [ ] 2.1 Create chat types file
        - File: `apps/web/src/shared/types/chat.ts`
        - Define: StreamEvent, ContentBlock types (TextBlock, ThinkingBlock, ToolUseBlock, ToolResultBlock)
        - Define: ChatMessage, ToolCall interfaces
        - Ensure types match agent-cli-sdk's event format
- [ ] 2.2 Export types from index
        - File: `apps/web/src/shared/types/index.ts` (create if needed)
        - Add: `export * from './chat'`

#### Completion Notes

### 3: Utilities

<!-- prettier-ignore -->
- [ ] 3.1 Create JSONL parser
        - File: `apps/web/src/client/utils/parseClaudeSession.ts`
        - Function: `parseJSONLSession(jsonlContent: string): ChatMessage[]`
        - Parse line-by-line, handling assistant/user events
        - Track tool_use blocks and link to tool_result blocks
        - Handle edge cases: empty lines, malformed JSON, missing timestamps
- [ ] 3.2 Create language detection utility
        - File: `apps/web/src/client/utils/getLanguageFromPath.ts`
        - Function: `getLanguageFromPath(filePath: string): string`
        - Map file extensions to language identifiers (ts→typescript, py→python, etc.)
        - Default to 'text' for unknown extensions
- [ ] 3.3 Create syntax highlighter wrapper
        - File: `apps/web/src/client/utils/syntaxHighlighter.tsx`
        - Component: `SyntaxHighlighter({ code, language, showLineNumbers })`
        - Use shiki for highlighting
        - Support light/dark themes
        - Cache highlighter instance for performance

#### Completion Notes

### 4: Data Hook

<!-- prettier-ignore -->
- [ ] 4.1 Create useClaudeSession hook
        - File: `apps/web/src/client/hooks/useClaudeSession.ts`
        - Function: `useClaudeSession(sessionFile?: string)`
        - Fetch JSONL from `/mocks/` directory
        - Parse using parseJSONLSession utility
        - Return: `{ messages: ChatMessage[], isLoading: boolean, error?: Error }`
        - Handle loading and error states

#### Completion Notes

### 5: Base Components

<!-- prettier-ignore -->
- [ ] 5.1 Create ChatSkeleton loader
        - File: `apps/web/src/client/components/chat/ChatSkeleton.tsx`
        - Use shadcn Skeleton component
        - Show 3-4 message skeletons with varying widths
- [ ] 5.2 Create FileReference component
        - File: `apps/web/src/client/components/chat/FileReference.tsx`
        - Props: `filePath: string, lineNumber?: number`
        - Render as clickable badge with file icon
        - Format: `filename.ext:123` or just `filename.ext`
        - Use lucide-react icons (FileText, FileCode, etc.)
- [ ] 5.3 Create TextBlock component
        - File: `apps/web/src/client/components/chat/TextBlock.tsx`
        - Props: `text: string`
        - Use react-markdown with remark-gfm for rendering
        - Custom renderers for code (inline vs block), links, blockquotes
        - Style with prose classes for typography
- [ ] 5.4 Create CodeBlock component
        - File: `apps/web/src/client/components/chat/CodeBlock.tsx`
        - Props: `code: string, language: string, showLineNumbers?: boolean, collapsedByDefault?: boolean`
        - Header with language badge and copy button
        - Use SyntaxHighlighter for code rendering
        - Collapsible if >20 lines and collapsedByDefault=true
        - Max height with scroll for long code
- [ ] 5.5 Create DiffViewer component
        - File: `apps/web/src/client/components/chat/DiffViewer.tsx`
        - Props: `oldString: string, newString: string, filePath: string`
        - Use 'diff' library's diffLines function
        - Render line-by-line with +/- indicators
        - Green background for additions, red for deletions
        - File path header
        - Max height with scroll

#### Completion Notes

### 6: Message Components

<!-- prettier-ignore -->
- [ ] 6.1 Create UserMessage component
        - File: `apps/web/src/client/components/chat/UserMessage.tsx`
        - Props: `message: ChatMessage`
        - Right-aligned blue bubble design
        - Extract text blocks from message.content
        - Show timestamp (smaller, lighter text)
        - Support multiple text blocks (concatenate or separate)
- [ ] 6.2 Create AssistantMessage component
        - File: `apps/web/src/client/components/chat/AssistantMessage.tsx`
        - Props: `message: ChatMessage`
        - Left-aligned with AI avatar (use shadcn Avatar)
        - Map over message.content array
        - Use ContentBlockRenderer for each block
        - Show timestamp and streaming indicator if isStreaming=true
- [ ] 6.3 Create ContentBlockRenderer component
        - File: `apps/web/src/client/components/chat/ContentBlockRenderer.tsx`
        - Props: `block: ContentBlock`
        - Switch on block.type
        - Route to: TextBlock, ThinkingBlock, or ToolUseBlock
        - Handle unknown block types gracefully
- [ ] 6.4 Create MessageRenderer component
        - File: `apps/web/src/client/components/chat/MessageRenderer.tsx`
        - Props: `message: ChatMessage`
        - Switch on message.role
        - Route to UserMessage or AssistantMessage
        - Skip system messages (or render minimal indicator)

#### Completion Notes

### 7: Advanced Blocks

<!-- prettier-ignore -->
- [ ] 7.1 Create ThinkingBlock component
        - File: `apps/web/src/client/components/chat/ThinkingBlock.tsx`
        - Props: `thinking: string`
        - Use shadcn Collapsible component
        - Trigger shows "Thinking..." with brain icon
        - Content shows reasoning text (pre-wrapped, italic)
        - Collapsed by default
        - Border and subtle background color
- [ ] 7.2 Create ToolResultRenderer component
        - File: `apps/web/src/client/components/chat/tools/ToolResultRenderer.tsx`
        - Props: `result: string, isError: boolean`
        - Conditional styling: error state (red) vs success (green/neutral)
        - Truncate very long results with "show more" toggle
        - Monospace font for output
- [ ] 7.3 Create ToolInputRenderer component
        - File: `apps/web/src/client/components/chat/tools/ToolInputRenderer.tsx`
        - Props: `toolName: string, input: Record<string, unknown>`
        - Switch on toolName to render tool-specific input
        - Route to: EditToolRenderer, WriteToolRenderer, ReadToolRenderer, BashToolRenderer
        - Fallback: JSON.stringify for unknown tools
- [ ] 7.4 Create ToolUseBlock component
        - File: `apps/web/src/client/components/chat/ToolUseBlock.tsx`
        - Props: `toolCall: ToolUseBlock & { result?: ToolResult }`
        - Header: tool name badge + tool ID + expand button
        - Blue border/background to distinguish from text
        - Collapsible content: ToolInputRenderer + ToolResultRenderer
        - Collapsed by default
        - Show loading spinner if result is pending

#### Completion Notes

### 8: Tool-Specific Renderers

<!-- prettier-ignore -->
- [ ] 8.1 Create EditToolRenderer
        - File: `apps/web/src/client/components/chat/tools/EditToolRenderer.tsx`
        - Props: `input: { file_path: string, old_string: string, new_string: string }`
        - Show file path with FileEdit icon
        - Use DiffViewer to show changes
        - Handle replace_all flag if present in input
- [ ] 8.2 Create WriteToolRenderer
        - File: `apps/web/src/client/components/chat/tools/WriteToolRenderer.tsx`
        - Props: `input: { file_path: string, content: string }`
        - Show file path with FilePlus icon
        - Use CodeBlock to show new file content
        - Detect language from file_path
        - Collapse if content >20 lines
- [ ] 8.3 Create ReadToolRenderer
        - File: `apps/web/src/client/components/chat/tools/ReadToolRenderer.tsx`
        - Props: `input: { file_path: string, offset?: number, limit?: number }`
        - Show "Read" label with FileText icon
        - Use FileReference component for file path
        - Show offset/limit if present (e.g., "lines 100-200")
- [ ] 8.4 Create BashToolRenderer
        - File: `apps/web/src/client/components/chat/tools/BashToolRenderer.tsx`
        - Props: `input: { command: string, description?: string }`
        - Show Terminal icon with command in monospace
        - Show description if present
        - Result: show stdout/stderr with proper formatting

#### Completion Notes

### 9: Main Chat Interface

<!-- prettier-ignore -->
- [ ] 9.1 Create ChatInterface component
        - File: `apps/web/src/client/components/chat/ChatInterface.tsx`
        - Props: `projectId: string`
        - Use useClaudeSession hook to load messages
        - Show ChatSkeleton while loading
        - Scrollable message list container
        - Map messages to MessageRenderer
        - Auto-scroll to bottom on new messages (useEffect with ref)
        - Empty state: "No messages yet" with placeholder
- [ ] 9.2 Add auto-scroll behavior
        - Create ref to bottom div
        - useEffect that scrolls into view when messages change
        - Smooth scroll behavior
        - Only auto-scroll if already near bottom (preserve manual scroll position)

#### Completion Notes

### 10: Integration & Polish

<!-- prettier-ignore -->
- [ ] 10.1 Update ProjectDetail page
        - File: `apps/web/src/client/pages/ProjectDetail.tsx`
        - Import ChatInterface component
        - Replace TabsContent for "chat" with: `<ChatInterface projectId={id!} />`
        - Ensure full height layout (flex-1, m-0)
- [ ] 10.2 Test with mock data
        - Navigate to project detail page, click Chat tab
        - Verify messages load and render correctly
        - Test: user messages, assistant messages, thinking blocks, tool calls
        - Expand/collapse tool details and thinking blocks
        - Check file references render properly
        - Verify diffs show correctly for Edit tools
        - Test code blocks with different languages
- [ ] 10.3 Verify dark mode support
        - Toggle between light and dark mode
        - Check all components render correctly
        - Verify syntax highlighting themes
        - Check diff colors are readable
        - Verify borders and backgrounds work in both modes
- [ ] 10.4 Add loading and error states
        - Test with missing JSONL file (error handling)
        - Test with malformed JSONL (parser error handling)
        - Verify loading skeleton shows initially
        - Add error boundary around ChatInterface

#### Completion Notes

### 11: Documentation

<!-- prettier-ignore -->
- [ ] 11.1 Add comments for future WebSocket integration
        - File: `apps/web/src/client/components/chat/ChatInterface.tsx`
        - Add comment block explaining how to swap useClaudeSession for useAgentWebSocket
        - Reference agent-cli-sdk event types
- [ ] 11.2 Document tool renderer extension pattern
        - File: `apps/web/src/client/components/chat/tools/ToolInputRenderer.tsx`
        - Add comment explaining how to add new tool renderers
        - Example: case 'NewTool': return <NewToolRenderer input={input} />
- [ ] 11.3 Create example components (optional, for testing/showcase)
        - Files in: `apps/web/src/client/components/chat/examples/`
        - ToolCallExample.tsx - showcase different tools
        - CodeBlockExample.tsx - different languages
        - DiffExample.tsx - file edit visualization

#### Completion Notes

## Acceptance Criteria

**Must Work:**

- [ ] Load and parse JSONL mock session file without errors
- [ ] Display user messages (right-aligned, blue bubble)
- [ ] Display assistant messages (left-aligned, with avatar)
- [ ] Show thinking blocks collapsed by default, expandable on click
- [ ] Render tool calls with name badge and tool ID
- [ ] Expand/collapse tool call details showing input and output
- [ ] Edit tool shows side-by-side diff with proper color coding (green additions, red deletions)
- [ ] Write tool shows syntax-highlighted new file content
- [ ] Read tool shows file reference as clickable badge
- [ ] Code blocks have syntax highlighting based on language
- [ ] Code blocks >20 lines collapse by default with "Expand" button
- [ ] Copy button on code blocks copies code to clipboard
- [ ] File references display in `file_path:line_number` format
- [ ] Auto-scroll to bottom when messages load
- [ ] Handle empty state (no messages yet)
- [ ] Handle loading state with skeleton
- [ ] Handle error state (failed to load JSONL)
- [ ] Dark mode works correctly for all components
- [ ] Markdown in text blocks renders properly (links, bold, italic, lists, code)

**Should Not:**

- [ ] Break existing project detail page functionality
- [ ] Cause console errors or warnings
- [ ] Have layout overflow or scrolling issues
- [ ] Lose scroll position on collapse/expand
- [ ] Flash unstyled content during load
- [ ] Block main thread during large JSONL parsing

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/web && pnpm build
# Expected: Build completes without errors

# Type checking
cd apps/web && pnpm check-types
# Expected: No type errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors (or only existing issues)
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173/projects` (or wherever Vite dev server runs)
3. Click on any project to open ProjectDetail page
4. Click "Chat" tab
5. Verify messages load and display correctly

**Feature-Specific Checks:**

- **Message Rendering:**
  - User messages appear on right side with blue background
  - Assistant messages appear on left with AI avatar
  - Timestamps show correctly formatted

- **Thinking Blocks:**
  - Click "Thinking..." to expand reasoning text
  - Text displays in italic with subtle background
  - Collapse works on second click

- **Tool Calls:**
  - Tool name appears as badge (e.g., "Read", "Edit", "Write")
  - Tool ID shown in monospace font
  - Click to expand shows tool input and output
  - Edit tool shows diff view with colored additions/deletions
  - Write tool shows syntax-highlighted code
  - Read tool shows file path badge

- **Code Blocks:**
  - Syntax highlighting matches file language
  - Copy button appears on hover
  - Long blocks (>20 lines) collapse with "Expand (N lines)" button
  - Line numbers display if enabled

- **Dark Mode:**
  - Toggle dark mode via theme switcher
  - All components render correctly in both modes
  - Syntax highlighting uses appropriate theme
  - Diff colors remain readable

- **Performance:**
  - Large JSONL files load without freezing UI
  - Scroll is smooth
  - Collapse/expand is instant

- **Error Handling:**
  - Test with missing file: verify error message displays
  - Test with malformed JSONL: verify parser doesn't crash
  - Check browser console: no errors or warnings

## Definition of Done

- [ ] All tasks completed and checked off
- [ ] Build passes without errors
- [ ] Type checking passes
- [ ] Lint passes (no new issues introduced)
- [ ] Manual testing confirms all acceptance criteria
- [ ] No console errors in browser
- [ ] Dark mode works correctly
- [ ] Components follow existing shadcn/ui patterns
- [ ] Code is properly typed with TypeScript
- [ ] File structure is organized and logical
- [ ] Comments added for future WebSocket integration points

## Notes

**Dependencies:**
- Requires shadcn/ui components already set up in the project (which they are)
- AI SDK Elements builds on top of shadcn/ui
- Mock JSONL file must be accessible via public directory

**Future Enhancements (Out of Scope):**
- Real-time WebSocket streaming from agent-cli-sdk
- Message input box for sending new messages
- File upload for image attachments
- Session management (list, resume, create new)
- Export conversation to markdown/PDF
- Search/filter messages
- Keyboard shortcuts

**Architecture Notes:**
- All types align with `@repo/agent-cli-sdk` StreamEvent format
- Easy to swap mock data hook for WebSocket hook later
- No custom event mapping needed - SDK events map directly to UI
- Tool renderers are extensible via switch statement pattern

**Rollback Considerations:**
- If issues arise, simply revert ProjectDetail.tsx to show "Chat content coming soon..."
- All new code is isolated in `/components/chat/` directory
- No existing functionality is modified (only additions)
