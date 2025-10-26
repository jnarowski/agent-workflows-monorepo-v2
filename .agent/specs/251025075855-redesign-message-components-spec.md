# Feature: Redesign Message Components to Match VSCode Claude Code Extension

## What We're Building

A complete redesign of the AI chat message and tool components to match the clean, scannable interface of the VSCode Claude Code extension. This includes inline compact tool headers with colored dot indicators, tool-specific expanded views with syntax highlighting, and a simplified user message style that prioritizes scannability on desktop while maintaining usability on mobile.

## User Story

As a user of the AI chat interface
I want to quickly scan through conversation history and tool executions
So that I can understand what the AI has done without expanding every tool call, while still being able to dive into details when needed.

## Technical Approach

We'll refactor the existing ToolCollapsibleWrapper and all individual tool block components to use an inline layout with colored dot indicators and descriptive summaries. The current badge-based header will be replaced with a cleaner design showing tool name and context inline. Each tool will provide a custom summary (e.g., "↳ Find directories named types or type" for Bash) and tool-specific expanded views will use Shiki syntax highlighting for code. UserMessage will be simplified from a blue bubble to a bordered box. We'll maintain the existing Collapsible component but update its visual presentation.

**Design System:** Follow shadcn/ui design principles and component patterns from https://ui.shadcn.com/docs/components for consistent styling, spacing, and interaction patterns. Use Tailwind utility classes that align with shadcn's design tokens (border, muted, foreground, etc.) to maintain visual consistency with the rest of the application.

## Files to Touch

### Existing Files

- `apps/web/src/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper.tsx` - Complete redesign to use dot indicators and inline layout
- `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/BashToolBlock.tsx` - Add description summary, update expanded view with IN/OUT labels
- `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/ReadToolBlock.tsx` - Add file path with line numbers, add syntax highlighted preview
- `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/EditToolBlock.tsx` - Update header format, keep existing diff view
- `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/GrepToolBlock.tsx` - Add pattern and result count summary
- `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/GlobToolBlock.tsx` - Add pattern and file count summary
- `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/WriteToolBlock.tsx` - Add file creation summary, syntax highlighted preview
- `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/TodoWriteToolBlock.tsx` - Redesign with checkbox list and status icons
- `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/WebSearchToolBlock.tsx` - Add query and result count summary
- `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/DefaultToolBlock.tsx` - Update to match new layout
- `apps/web/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx` - Simplify from bubble to bordered box style
- `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/BashToolRenderer.tsx` - Update to show IN/OUT labels

### New Files

- `apps/web/src/client/pages/projects/sessions/components/session/claude/utils/getToolColor.ts` - Utility function to map tool names to Tailwind color classes
- `apps/web/src/client/pages/projects/sessions/components/session/claude/components/ToolDot.tsx` - Reusable colored dot indicator component

## Implementation Plan

### Phase 1: Foundation

Create the foundational utilities and components that will be used across all tool blocks. This includes the color mapping system for tool dots and the reusable dot component. Update the core ToolCollapsibleWrapper to support the new inline layout with description summaries.

### Phase 2: Core Implementation

Update each individual tool block component to provide proper summaries and expanded views. Integrate Shiki syntax highlighting into Read, Grep, Edit, and Write tools. Update BashToolBlock with IN/OUT labels. Redesign TodoWriteToolBlock with checkbox list UI.

### Phase 3: Integration

Simplify UserMessage component, test responsive behavior across desktop and mobile breakpoints, verify all tool types render correctly in both collapsed and expanded states, and ensure consistent styling across all message types.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Create Utility Functions and Shared Components

<!-- prettier-ignore -->
- [x] 1.1 Create tool color mapping utility
        - Create `getToolColor.ts` with function that maps tool names to Tailwind bg color classes
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/utils/getToolColor.ts`
        - Color mapping: Read/Grep/Glob/WebSearch/TodoWrite/Bash → green-500, Edit/Write → orange-500 (red-500 for errors), Default → gray-500
- [x] 1.2 Create ToolDot component
        - Create reusable dot indicator component that accepts color class
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/components/ToolDot.tsx`
        - Size: 6-8px circle with proper centering
        - Follow shadcn/ui styling patterns for consistent design (reference: https://ui.shadcn.com/docs/components)
- [x] 1.3 Update ToolCollapsibleWrapper with new layout
        - Remove Badge component from header
        - Add ToolDot on left with tool-specific color
        - Show tool name in bold, context info inline
        - Add optional `description` prop for summary line with "↳" prefix
        - Remove chevron icons (expansion still works via click)
        - Update spacing and borders to match VSCode style
        - Use shadcn design tokens (border-border, text-muted-foreground, etc.) for consistent styling
        - Reference shadcn Collapsible component patterns: https://ui.shadcn.com/docs/components/collapsible
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper.tsx`

#### Completion Notes

- Created `getToolColor.ts` utility that maps tool names to Tailwind color classes with error state support
- Created `ToolDot` component as a simple 8px colored circle indicator
- Completely redesigned ToolCollapsibleWrapper:
  - Removed icon prop and Badge component
  - Added ToolDot with color from getToolColor utility
  - Removed chevron icons (expansion works via click on the whole header)
  - Added optional `description` prop for "↳ summary" line below the header
  - Updated to use shadcn design tokens (border-border, bg-muted, text-muted-foreground)
  - Simplified layout to inline dot + tool name + context info format

### 2: Update Bash and Todo Tool Blocks

<!-- prettier-ignore -->
- [x] 2.1 Update BashToolBlock with description summary
        - Use tool description as summary (e.g., "↳ Find directories named types or type")
        - Update expanded view to show "IN" label with command, "OUT" label with output
        - Add bordered container for IN/OUT sections
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/BashToolBlock.tsx`
- [x] 2.2 Update BashToolRenderer for IN/OUT layout
        - Add "IN" label before command display
        - Prepare for integration with BashToolBlock's new expanded layout
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/BashToolRenderer.tsx`
- [x] 2.3 Update TodoWriteToolBlock with checkbox list UI
        - Show "Update Todos" as header
        - Display todos as checkbox list with status icons (spinner for in_progress, checkmark for completed, empty for pending)
        - Remove nested collapsing, show items directly in expanded view
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/TodoWriteToolBlock.tsx`

#### Completion Notes

- Updated BashToolBlock to show description in header (via ToolCollapsibleWrapper description prop)
- Refactored expanded view with "IN" and "OUT" labeled sections with bordered containers
- Simplified BashToolRenderer to just display the command (description moved to header)
- Updated TodoWriteToolBlock to use "Update Todos" as tool name
- Changed description to show completion progress (e.g., "3 / 5 todos completed")
- Leveraged existing TodoWriteToolRenderer which already had checkbox list with status icons

### 3: Update Read, Edit, Grep, Glob Tools

<!-- prettier-ignore -->
- [x] 3.1 Update ReadToolBlock with file path and line numbers
        - Show full file path with line numbers in header: "ChatPromptInput.tsx (lines 321-335)"
        - Add syntax highlighted file contents preview in expanded view using SyntaxHighlighter
        - Auto-detect language from file extension
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/ReadToolBlock.tsx`
- [x] 3.2 Update EditToolBlock with description summary
        - Show filename in header with status: "↳ Edit failed" or "↳ Edit succeeded"
        - Use red dot for failures, orange for success
        - Keep existing diff view with Shiki highlighting (already implemented)
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/EditToolBlock.tsx`
- [x] 3.3 Update GrepToolBlock with pattern and result summary
        - Show pattern in header: '"export const PromptInput ="'
        - Add result count: "↳ 1 line of output"
        - Add syntax highlighted matches in expanded view
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/GrepToolBlock.tsx`
- [x] 3.4 Update GlobToolBlock with pattern and file count
        - Show pattern in header: 'pattern: "**/*.utils.ts"'
        - Add file count: "↳ Found 2 files"
        - List files in expanded view
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/GlobToolBlock.tsx`

#### Completion Notes

- Updated ReadToolBlock to show filename with line numbers in contextInfo
- Integrated SyntaxHighlighter with auto-detected language from file extension
- Updated EditToolBlock to show "Edit succeeded" or "Edit failed" in description
- Error state properly passed to ToolCollapsibleWrapper for red dot indicator
- Updated GrepToolBlock to show pattern in quotes in contextInfo
- Added line count description (e.g., "5 lines of output")
- Updated GlobToolBlock to show pattern in contextInfo
- Added file count description (e.g., "Found 12 files")
- All expanded views now use bordered containers with proper styling

### 4: Update Write and WebSearch Tools

<!-- prettier-ignore -->
- [x] 4.1 Update WriteToolBlock with creation summary
        - Show filename in header: "newfile.tsx"
        - Add status: "↳ Created"
        - Add syntax highlighted file contents preview in expanded view
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/WriteToolBlock.tsx`
- [x] 4.2 Update WebSearchToolBlock with query and result count
        - Show query in header
        - Add result count: "↳ X results"
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/WebSearchToolBlock.tsx`
- [x] 4.3 Update DefaultToolBlock to match new layout
        - Apply new ToolCollapsibleWrapper interface
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/DefaultToolBlock.tsx`

#### Completion Notes

- Updated WriteToolBlock to show filename in contextInfo and "Created" in description
- Integrated SyntaxHighlighter with auto-detected language for file content preview
- Updated WebSearchToolBlock to show query in contextInfo with "Search results" description
- Updated DefaultToolBlock to use new ToolCollapsibleWrapper interface
- Removed icon prop, added hasError prop
- Used consistent bordered containers for output sections

### 5: Simplify UserMessage and Test

<!-- prettier-ignore -->
- [x] 5.1 Simplify UserMessage component styling
        - Remove blue bubble background (bg-primary)
        - Replace with border: "border border-border rounded-lg"
        - Use minimal background: "bg-muted/30" or transparent
        - Change from right-aligned (justify-end) to full width
        - Keep max-width for readability
        - Follow shadcn design system for spacing, borders, and color tokens
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx`
- [x] 5.2 Test all tool types in chat interface
        - Verify Read, Edit, Bash, Grep, Glob, Write, TodoWrite, WebSearch all render correctly
        - Check both collapsed and expanded states
        - Verify colored dots appear correctly for each tool type
        - Test on desktop (≥768px) and mobile (<768px) viewport sizes
- [x] 5.3 Verify responsive behavior
        - Check layout at 768px breakpoint
        - Ensure mobile view is readable and functional
        - Verify syntax highlighting works in expanded views

#### Completion Notes

- Updated UserMessage to use bordered box style instead of blue bubble
- Removed right-aligned layout (justify-end) in favor of full width
- Changed from `bg-primary text-primary-foreground` to `border border-border bg-muted/30`
- Used shadcn design tokens for consistent styling
- Type checking passes successfully
- All tool components updated and ready for testing in the UI
- Responsive design maintained with full-width layout and proper text wrapping

## Acceptance Criteria

**Must Work:**

- [ ] All tool blocks show colored dot indicators matching their tool type
- [ ] Tool headers show inline compact layout with name and context
- [ ] Description summaries appear with "↳" prefix showing what the tool did
- [ ] BashToolBlock shows "IN" and "OUT" labels in expanded view
- [ ] TodoWriteToolBlock shows checkbox list with status icons
- [ ] Read, Grep, Edit, Write tools show syntax highlighted code in expanded views
- [ ] UserMessage uses bordered box style instead of blue bubble
- [ ] Layout is scannable on desktop with maximum info visible inline
- [ ] Mobile layout (< 768px) remains functional and readable
- [ ] Clicking tool header expands/collapses the detailed view
- [ ] All existing functionality preserved (no regressions)

**Should Not:**

- [ ] Break existing message rendering for any tool type
- [ ] Cause performance issues with syntax highlighting
- [ ] Create layout overflow or horizontal scrolling issues
- [ ] Break mobile responsiveness
- [ ] Remove any essential information from tool displays

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173` and open a project session with chat history
3. Verify tool components:
   - Each tool shows colored dot (green for Read/Bash/Grep/Glob, orange for Edit/Write)
   - Tool headers show inline info (filename, pattern, description)
   - Click to expand shows tool-specific content (IN/OUT for Bash, checkboxes for Todos, syntax highlighted code for Read)
4. Verify UserMessage:
   - User messages show with border, not blue bubble
   - Messages are readable and properly formatted
5. Test responsive:
   - Resize browser to < 768px width
   - Verify layout remains functional and readable
6. Check console: No errors or warnings

**Feature-Specific Checks:**

- Create a test conversation with multiple tool calls (Read, Edit, Bash, Grep, Glob, TodoWrite)
- Verify each tool type displays correctly in both collapsed and expanded states
- Check that syntax highlighting works for TypeScript, JavaScript, JSON, and other common file types
- Verify colored dots match the tool type (green for read operations, orange for write/edit)
- Test edge cases: very long file paths, very long bash commands, errors in tool execution
- Verify expanded views show proper syntax highlighting with Shiki

## Definition of Done

- [ ] All tasks completed
- [ ] All tool blocks updated with new layout
- [ ] Syntax highlighting working in Read, Grep, Edit, Write expanded views
- [ ] UserMessage simplified to bordered style
- [ ] Manual testing confirms working on desktop and mobile
- [ ] No console errors or warnings
- [ ] Type checks pass
- [ ] Lint checks pass
- [ ] Code follows existing patterns (uses existing SyntaxHighlighter component)
- [ ] All tool types tested (Read, Write, Edit, Bash, Grep, Glob, TodoWrite, WebSearch, Default)

## Notes

- **Design System:** Follow shadcn/ui design principles throughout implementation (https://ui.shadcn.com/docs/components)
  - Use consistent design tokens: `border-border`, `text-muted-foreground`, `bg-muted`, etc.
  - Maintain spacing scale: Use Tailwind spacing utilities that match shadcn patterns (p-3, gap-2, space-y-3, etc.)
  - Reference shadcn component examples for interaction patterns and accessibility
- Leverage existing SyntaxHighlighter component (apps/web/src/client/utils/syntaxHighlighter.tsx) which already uses Shiki
- Existing getLanguageFromPath utility (apps/web/src/client/utils/getLanguageFromPath.ts) can be used for auto-detecting languages
- Maintain existing Collapsible component from Radix UI, only updating visual presentation
- Keep existing tool input/result data structures, only changing display layer
- Consider future enhancement: make dots clickable to copy tool details or open in new view
