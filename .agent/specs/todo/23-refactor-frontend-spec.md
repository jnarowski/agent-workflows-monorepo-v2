# Frontend Refactoring - Code Quality & Best Practices

**Status**: draft
**Created**: 2025-10-30
**Package**: apps/web
**Estimated Effort**: 6-8 hours

## Overview

Refactor the React frontend to address critical code quality issues identified in the audit, including fixing relative import violations, breaking down oversized components, improving type safety, and optimizing performance. This ensures the codebase follows best practices outlined in CLAUDE.md and maintains high code quality for future development.

## User Story

As a developer working on the web app
I want a clean, well-organized frontend codebase that follows best practices
So that I can easily maintain, extend, and debug features without fighting technical debt

## Technical Approach

This refactoring focuses on four key areas:
1. **Import Consistency** - Replace all relative imports with `@/` path aliases across 20 files
2. **Component Size Reduction** - Break down 3 oversized components (ChatPromptInput 505→200 lines, FileTree 389→150 lines, ProjectSession 282→150 lines)
3. **Type Safety** - Remove `any` types and add proper TypeScript interfaces
4. **Performance** - Batch state updates and consolidate duplicate utilities

The approach minimizes risk by making incremental changes that preserve existing functionality while improving code quality.

## Key Design Decisions

1. **Extract Custom Hooks for State Management**: Complex components like `ChatPromptInput` will have state logic extracted into custom hooks (e.g., `usePromptInputState`), following React best practices for separation of concerns.

2. **Batch Store Updates**: FileTree will collect expansion paths and update the store once instead of multiple times in a loop, reducing re-renders and improving performance.

3. **Strict TypeScript**: Remove all `/* eslint-disable */` comments related to `any` types by defining proper interfaces, ensuring type safety across WebSocket configurations.

## Architecture

### File Structure Changes

```
apps/web/src/client/
├── pages/
│   └── projects/
│       ├── sessions/
│       │   ├── components/
│       │   │   ├── chat/
│       │   │   │   ├── ChatPromptInput/              # NEW: Component folder
│       │   │   │   │   ├── ChatPromptInput.tsx       # REFACTORED: Main component (200 lines)
│       │   │   │   │   ├── FilePickerPopover.tsx     # NEW: Extracted
│       │   │   │   │   ├── SlashCommandPopover.tsx   # NEW: Extracted
│       │   │   │   │   └── PermissionModeSelector.tsx # NEW: Extracted
│       │   │   │   └── ChatPromptInput.test.tsx      # UPDATED: Update imports
│       │   │   └── session/
│       │   │       └── claude/                        # UPDATED: Fix relative imports
│       │   └── hooks/
│       │       ├── usePromptInputState.ts             # NEW: State management hook
│       │       └── useSessionWebSocket.ts             # UPDATED: Add SessionConfig type
│       ├── files/
│       │   ├── components/
│       │   │   ├── FileTree/                          # NEW: Component folder
│       │   │   │   ├── FileTree.tsx                   # REFACTORED: Main component (150 lines)
│       │   │   │   ├── FileTreeSearch.tsx             # NEW: Extracted
│       │   │   │   └── FileTreeItem.tsx               # NEW: Extracted
│       │   │   └── FileEditor.tsx                     # UPDATED: Remove duplicate util
│       │   ├── hooks/
│       │   │   └── useFileTreeExpansion.ts            # NEW: Expansion logic hook
│       │   └── stores/
│       │       └── filesStore.ts                      # UPDATED: Add batch expansion
│       └── git/                                       # UPDATED: Fix relative imports
└── lib/
    └── permissionModes.ts                             # NEW: Shared constants
```

### Integration Points

**Session Components**:
- `apps/web/src/client/pages/projects/sessions/components/session/claude/*.tsx` - Update all imports from relative to `@/client/` aliases
- `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput.tsx` - Refactor into smaller components

**Git Components**:
- `apps/web/src/client/pages/projects/git/components/*.tsx` - Update all imports from relative to `@/client/` aliases

**Files Components**:
- `apps/web/src/client/pages/projects/files/components/FileTree.tsx` - Refactor and optimize
- `apps/web/src/client/pages/projects/files/stores/filesStore.ts` - Add batch update action

**WebSocket Hook**:
- `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Add proper TypeScript interfaces

## Implementation Details

### 1. Import Path Standardization

**Affected Files (20 total)**:
- Session claude tool blocks: `TextBlock.tsx`, `AskUserQuestionToolBlock.tsx`, `BashToolBlock.tsx`, `EditToolBlock.tsx`, `GlobToolBlock.tsx`, `GrepToolBlock.tsx`, `NotebookEditToolBlock.tsx`, `ReadToolBlock.tsx`, `SlashCommandToolBlock.tsx`, `TaskToolBlock.tsx`, `TodoWriteToolBlock.tsx`, `WebFetchToolBlock.tsx`, `WebSearchToolBlock.tsx`, `WriteToolBlock.tsx`
- Git components: `CreatePullRequestDialog.tsx`, `HistoryView.tsx`, `FileChangeItem.tsx`, `CommitDiffView.tsx`

**Key Points**:
- Replace patterns like `../../CodeBlock` with `@/client/pages/projects/sessions/components/CodeBlock`
- Replace patterns like `../components/ToolDot` with full `@/client/` paths
- Ensure all imports follow CLAUDE.md rule: "Always use `@/` aliases, never use relative imports"

### 2. ChatPromptInput Component Breakdown

**Current**: 505 lines with multiple responsibilities
**Target**: ~200 lines main component + 4 extracted components

**Extraction Strategy**:
1. **usePromptInputState.ts** - Custom hook managing:
   - Input value state
   - File context state
   - Slash command state
   - Image upload state
   - Focus management
   - Keyboard handlers

2. **FilePickerPopover.tsx** - File selection UI:
   - Popover with file tree
   - Selected files display
   - Add/remove file logic

3. **SlashCommandPopover.tsx** - Command selection UI:
   - Command filtering
   - Command list rendering
   - Selection handling

4. **PermissionModeSelector.tsx** - Permission mode UI:
   - Mode selector dropdown
   - Mode descriptions
   - Configuration state

**Key Points**:
- Maintain existing prop interface for backward compatibility
- Keep `forwardRef` and `useImperativeHandle` pattern for focus management
- All tests should continue passing with minimal updates

### 3. FileTree Component Refactoring

**Current**: 389 lines with search, filtering, expansion, rendering
**Target**: ~150 lines main component + 3 extracted pieces

**Extraction Strategy**:
1. **FileTreeSearch.tsx** - Search UI component:
   - Search input
   - Filter toggles (files only, directories only)
   - Clear search button

2. **FileTreeItem.tsx** - Recursive tree item:
   - Individual file/directory rendering
   - Expansion toggle
   - Icon rendering
   - Click handlers

3. **useFileTreeExpansion.ts** - Expansion logic hook:
   - Auto-expansion on search
   - Path collection
   - Match detection

**Key Points**:
- Preserve all existing functionality
- Maintain keyboard navigation
- Keep expansion state in Zustand store

### 4. Type Safety Improvements

**SessionConfig Interface** (new):
```typescript
interface SessionConfig {
  resume?: boolean;
  sessionId?: string;
  permissionMode?: ClaudePermissionMode;
  agentType?: AgentType;
  [key: string]: unknown; // For extensibility
}
```

**Changes in useSessionWebSocket.ts**:
- Remove `/* eslint-disable @typescript-eslint/no-explicit-any */`
- Replace `Record<string, any>` with `SessionConfig`
- Add proper type annotations

**Key Points**:
- Maintain backward compatibility
- Use `unknown` for extensibility instead of `any`
- Enable all TypeScript strict checks

### 5. Performance Optimizations

**filesStore.ts** - Add batch expansion action:
```typescript
expandMultipleDirs: (paths: string[]) => {
  set((state) => {
    const newExpanded = new Set(state.expandedDirs);
    paths.forEach(path => newExpanded.add(path));
    return { expandedDirs: newExpanded };
  });
}
```

**FileTree.tsx** - Update to use batch expansion:
```typescript
// Collect paths
const pathsToExpand: string[] = [];
collectExpandedPaths(files, pathsToExpand);

// Single store update
useFilesStore.getState().expandMultipleDirs(pathsToExpand);
```

**Key Points**:
- Reduces store updates from O(n) to O(1)
- Prevents multiple re-renders
- Maintains exact same behavior

### 6. Utility Consolidation

**Remove duplicate language extension logic**:
- Delete `getLanguageExtension()` from `FileEditor.tsx:24-50`
- Ensure `getLanguageFromPath.ts` is used consistently
- Update imports in `FileEditor.tsx`

**Extract permission modes configuration**:
- Create `apps/web/src/client/lib/permissionModes.ts`
- Move permission modes array from `ChatPromptInput.tsx:50-75`
- Export properly typed constant

**Key Points**:
- Single source of truth for each utility
- Easier to maintain and test
- Reduces code duplication

## Files to Create/Modify

### New Files (11)

1. `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/ChatPromptInput.tsx` - Refactored main component
2. `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/FilePickerPopover.tsx` - File picker UI
3. `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/SlashCommandPopover.tsx` - Slash command UI
4. `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/PermissionModeSelector.tsx` - Permission mode UI
5. `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/index.ts` - Re-export
6. `apps/web/src/client/pages/projects/sessions/hooks/usePromptInputState.ts` - State management hook
7. `apps/web/src/client/pages/projects/files/components/FileTree/FileTree.tsx` - Refactored main component
8. `apps/web/src/client/pages/projects/files/components/FileTree/FileTreeSearch.tsx` - Search UI
9. `apps/web/src/client/pages/projects/files/components/FileTree/FileTreeItem.tsx` - Tree item component
10. `apps/web/src/client/pages/projects/files/hooks/useFileTreeExpansion.ts` - Expansion hook
11. `apps/web/src/client/lib/permissionModes.ts` - Shared permission modes config

### Modified Files (26)

1. `apps/web/src/client/pages/projects/sessions/components/session/claude/TextBlock.tsx` - Fix imports
2. `apps/web/src/client/pages/projects/sessions/components/session/claude/AskUserQuestionToolBlock.tsx` - Fix imports
3. `apps/web/src/client/pages/projects/sessions/components/session/claude/BashToolBlock.tsx` - Fix imports
4. `apps/web/src/client/pages/projects/sessions/components/session/claude/EditToolBlock.tsx` - Fix imports
5. `apps/web/src/client/pages/projects/sessions/components/session/claude/GlobToolBlock.tsx` - Fix imports
6. `apps/web/src/client/pages/projects/sessions/components/session/claude/GrepToolBlock.tsx` - Fix imports
7. `apps/web/src/client/pages/projects/sessions/components/session/claude/NotebookEditToolBlock.tsx` - Fix imports
8. `apps/web/src/client/pages/projects/sessions/components/session/claude/ReadToolBlock.tsx` - Fix imports
9. `apps/web/src/client/pages/projects/sessions/components/session/claude/SlashCommandToolBlock.tsx` - Fix imports
10. `apps/web/src/client/pages/projects/sessions/components/session/claude/TaskToolBlock.tsx` - Fix imports
11. `apps/web/src/client/pages/projects/sessions/components/session/claude/TodoWriteToolBlock.tsx` - Fix imports
12. `apps/web/src/client/pages/projects/sessions/components/session/claude/WebFetchToolBlock.tsx` - Fix imports
13. `apps/web/src/client/pages/projects/sessions/components/session/claude/WebSearchToolBlock.tsx` - Fix imports
14. `apps/web/src/client/pages/projects/sessions/components/session/claude/WriteToolBlock.tsx` - Fix imports
15. `apps/web/src/client/pages/projects/git/components/CreatePullRequestDialog.tsx` - Fix imports
16. `apps/web/src/client/pages/projects/git/components/HistoryView.tsx` - Fix imports
17. `apps/web/src/client/pages/projects/git/components/FileChangeItem.tsx` - Fix imports
18. `apps/web/src/client/pages/projects/git/components/CommitDiffView.tsx` - Fix imports
19. `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Add SessionConfig interface
20. `apps/web/src/client/pages/projects/files/stores/filesStore.ts` - Add expandMultipleDirs action
21. `apps/web/src/client/pages/projects/files/components/FileEditor.tsx` - Remove duplicate util
22. `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput.test.tsx` - Update imports
23. `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx` - Update ChatPromptInput import
24. `apps/web/src/client/pages/projects/files/pages/FilesPage.tsx` - Update FileTree import
25. `apps/web/src/client/pages/projects/sessions/components/chat/ChatInterface.tsx` - Update ChatPromptInput import (if needed)
26. Delete: `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput.tsx` - Move to folder structure

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Import Path Standardization

<!-- prettier-ignore -->
- [ ] task-1.1: Fix imports in TextBlock.tsx
  - Replace `import { CodeBlock } from "../../CodeBlock"` with `import { CodeBlock } from "@/client/pages/projects/sessions/components/CodeBlock"`
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/TextBlock.tsx`
- [ ] task-1.2: Fix imports in AskUserQuestionToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/AskUserQuestionToolBlock.tsx`
- [ ] task-1.3: Fix imports in BashToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/BashToolBlock.tsx`
- [ ] task-1.4: Fix imports in EditToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/EditToolBlock.tsx`
- [ ] task-1.5: Fix imports in GlobToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/GlobToolBlock.tsx`
- [ ] task-1.6: Fix imports in GrepToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/GrepToolBlock.tsx`
- [ ] task-1.7: Fix imports in NotebookEditToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/NotebookEditToolBlock.tsx`
- [ ] task-1.8: Fix imports in ReadToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/ReadToolBlock.tsx`
- [ ] task-1.9: Fix imports in SlashCommandToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/SlashCommandToolBlock.tsx`
- [ ] task-1.10: Fix imports in TaskToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/TaskToolBlock.tsx`
- [ ] task-1.11: Fix imports in TodoWriteToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/TodoWriteToolBlock.tsx`
- [ ] task-1.12: Fix imports in WebFetchToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/WebFetchToolBlock.tsx`
- [ ] task-1.13: Fix imports in WebSearchToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/WebSearchToolBlock.tsx`
- [ ] task-1.14: Fix imports in WriteToolBlock.tsx
  - Replace all relative imports with `@/client/` path aliases
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/WriteToolBlock.tsx`
- [ ] task-1.15: Fix imports in git components (CreatePullRequestDialog, HistoryView, FileChangeItem, CommitDiffView)
  - Replace all relative imports with `@/client/` path aliases
  - Files: `apps/web/src/client/pages/projects/git/components/*.tsx`
- [ ] task-1.16: Verify all imports resolve correctly
  - Run: `pnpm check-types` from `apps/web/`
  - Expected: No import errors

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: Type Safety Improvements

<!-- prettier-ignore -->
- [ ] task-2.1: Create SessionConfig interface
  - Add interface definition at top of file
  - Include: resume?, sessionId?, permissionMode?, agentType?, and index signature
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
- [ ] task-2.2: Remove eslint-disable comment
  - Delete `/* eslint-disable @typescript-eslint/no-explicit-any */`
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts:1`
- [ ] task-2.3: Replace Record<string, any> with SessionConfig
  - Update function signatures to use SessionConfig
  - Update variable declarations
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
- [ ] task-2.4: Verify type safety
  - Run: `pnpm check-types` from `apps/web/`
  - Expected: No type errors, no any types in useSessionWebSocket.ts

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 3: Utility Consolidation

<!-- prettier-ignore -->
- [ ] task-3.1: Create permissionModes.ts utility
  - Extract permission modes array from ChatPromptInput.tsx:50-75
  - Export as `PERMISSION_MODES` constant with proper type
  - File: `apps/web/src/client/lib/permissionModes.ts`
- [ ] task-3.2: Remove duplicate getLanguageExtension from FileEditor
  - Delete lines 24-50 in FileEditor.tsx
  - Import getLanguageFromPath from utils instead
  - File: `apps/web/src/client/pages/projects/files/components/FileEditor.tsx`
- [ ] task-3.3: Verify utilities work correctly
  - Run: `pnpm check-types` from `apps/web/`
  - Expected: No errors

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 4: FileTree Performance Optimization

<!-- prettier-ignore -->
- [ ] task-4.1: Add expandMultipleDirs action to filesStore
  - Create new action that accepts string[] of paths
  - Batch update expandedDirs Set in single operation
  - File: `apps/web/src/client/pages/projects/files/stores/filesStore.ts`
- [ ] task-4.2: Update FileTree to use batch expansion
  - Modify useEffect to collect paths first
  - Call expandMultipleDirs once with all paths
  - File: `apps/web/src/client/pages/projects/files/components/FileTree.tsx:172-207`
- [ ] task-4.3: Test FileTree search expansion
  - Start dev server: `pnpm dev` from `apps/web/`
  - Navigate to Files page, perform search
  - Verify matching directories auto-expand
  - Check console for no performance warnings

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 5: ChatPromptInput Refactoring - Part 1 (Extract Hook)

<!-- prettier-ignore -->
- [ ] task-5.1: Create usePromptInputState hook
  - Extract all useState calls from ChatPromptInput
  - Extract event handlers (handleInputChange, handleKeyDown, etc.)
  - Return state and handlers object
  - File: `apps/web/src/client/pages/projects/sessions/hooks/usePromptInputState.ts`
- [ ] task-5.2: Add comprehensive JSDoc to usePromptInputState
  - Document all parameters and return values
  - Add usage example
  - File: `apps/web/src/client/pages/projects/sessions/hooks/usePromptInputState.ts`
- [ ] task-5.3: Verify hook compiles
  - Run: `pnpm check-types` from `apps/web/`
  - Expected: No errors

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 6: ChatPromptInput Refactoring - Part 2 (Extract Components)

<!-- prettier-ignore -->
- [ ] task-6.1: Create ChatPromptInput folder structure
  - Create directory: `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/`
  - Run: `mkdir -p apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput`
- [ ] task-6.2: Extract FilePickerPopover component
  - Move file picker UI and logic to new component
  - Accept file context state and handlers as props
  - File: `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/FilePickerPopover.tsx`
- [ ] task-6.3: Extract SlashCommandPopover component
  - Move slash command UI and logic to new component
  - Accept slash command state and handlers as props
  - File: `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/SlashCommandPopover.tsx`
- [ ] task-6.4: Extract PermissionModeSelector component
  - Move permission mode UI to new component
  - Import PERMISSION_MODES from lib/permissionModes.ts
  - File: `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/PermissionModeSelector.tsx`
- [ ] task-6.5: Verify extracted components compile
  - Run: `pnpm check-types` from `apps/web/`
  - Expected: No errors

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 7: ChatPromptInput Refactoring - Part 3 (Main Component)

<!-- prettier-ignore -->
- [ ] task-7.1: Create refactored ChatPromptInput.tsx
  - Move existing ChatPromptInput to new folder location
  - Refactor to use usePromptInputState hook
  - Integrate FilePickerPopover, SlashCommandPopover, PermissionModeSelector
  - Maintain forwardRef and useImperativeHandle pattern
  - Target: ~200 lines
  - File: `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/ChatPromptInput.tsx`
- [ ] task-7.2: Create index.ts barrel export
  - Export ChatPromptInput and ChatPromptInputHandle type
  - File: `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput/index.ts`
- [ ] task-7.3: Delete old ChatPromptInput.tsx file
  - Run: `rm apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput.tsx`
- [ ] task-7.4: Update imports in parent components
  - Update import path in ProjectSession.tsx
  - Update import path in ChatInterface.tsx
  - Files: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`, `apps/web/src/client/pages/projects/sessions/components/chat/ChatInterface.tsx`
- [ ] task-7.5: Update test file
  - Update import path in ChatPromptInput.test.tsx
  - Verify tests still pass
  - File: `apps/web/src/client/pages/projects/sessions/components/chat/ChatPromptInput.test.tsx`
  - Run: `pnpm test ChatPromptInput.test.tsx` from `apps/web/`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 8: FileTree Refactoring

<!-- prettier-ignore -->
- [ ] task-8.1: Create FileTree folder structure
  - Create directory: `apps/web/src/client/pages/projects/files/components/FileTree/`
  - Run: `mkdir -p apps/web/src/client/pages/projects/files/components/FileTree`
- [ ] task-8.2: Extract FileTreeSearch component
  - Move search input and filter toggles UI
  - Accept search state and handlers as props
  - File: `apps/web/src/client/pages/projects/files/components/FileTree/FileTreeSearch.tsx`
- [ ] task-8.3: Extract FileTreeItem component
  - Move individual tree item rendering
  - Make recursive for nested directories
  - Accept item data and handlers as props
  - File: `apps/web/src/client/pages/projects/files/components/FileTree/FileTreeItem.tsx`
- [ ] task-8.4: Create useFileTreeExpansion hook
  - Extract auto-expansion logic from useEffect
  - Return expansion handler function
  - File: `apps/web/src/client/pages/projects/files/hooks/useFileTreeExpansion.ts`
- [ ] task-8.5: Refactor main FileTree component
  - Move existing FileTree to new folder location
  - Use extracted components and hook
  - Target: ~150 lines
  - File: `apps/web/src/client/pages/projects/files/components/FileTree/FileTree.tsx`
- [ ] task-8.6: Create index.ts barrel export
  - Export FileTree component
  - File: `apps/web/src/client/pages/projects/files/components/FileTree/index.ts`
- [ ] task-8.7: Delete old FileTree.tsx file
  - Run: `rm apps/web/src/client/pages/projects/files/components/FileTree.tsx`
- [ ] task-8.8: Update imports in FilesPage
  - Update import path to use new folder structure
  - File: `apps/web/src/client/pages/projects/files/pages/FilesPage.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

**`usePromptInputState.test.ts`** - Test state management hook:

```typescript
describe('usePromptInputState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePromptInputState());
    expect(result.current.inputValue).toBe('');
    expect(result.current.fileContext).toEqual([]);
  });

  it('should update input value on change', () => {
    const { result } = renderHook(() => usePromptInputState());
    act(() => {
      result.current.handleInputChange('new value');
    });
    expect(result.current.inputValue).toBe('new value');
  });

  // Add more tests for handlers
});
```

**`filesStore.test.ts`** - Test batch expansion:

```typescript
describe('filesStore.expandMultipleDirs', () => {
  it('should expand multiple directories at once', () => {
    const store = useFilesStore.getState();
    store.expandMultipleDirs(['/path/one', '/path/two', '/path/three']);

    expect(store.expandedDirs.has('/path/one')).toBe(true);
    expect(store.expandedDirs.has('/path/two')).toBe(true);
    expect(store.expandedDirs.has('/path/three')).toBe(true);
  });
});
```

### Integration Tests

**ChatPromptInput Integration**:
- Render ChatPromptInput with all child components
- Test file picker interaction
- Test slash command selection
- Test permission mode switching
- Verify submit handlers called correctly

**FileTree Integration**:
- Render FileTree with mock file data
- Test search functionality
- Test auto-expansion on search
- Verify directory toggle works
- Test file selection

### E2E Tests

**Session Chat Flow** (`e2e/session-chat.test.ts`):
- Navigate to session page
- Type message in chat input
- Verify message appears in conversation
- Test file attachment workflow
- Test slash command workflow

**File Browser** (`e2e/file-browser.test.ts`):
- Navigate to files page
- Search for files
- Verify matching directories expand
- Open file in editor
- Verify syntax highlighting works

## Success Criteria

- [ ] All 20 files use `@/client/` path aliases (zero relative imports)
- [ ] ChatPromptInput.tsx is under 250 lines
- [ ] FileTree.tsx is under 200 lines
- [ ] No `any` types in useSessionWebSocket.ts
- [ ] `pnpm check-types` passes with zero errors
- [ ] `pnpm lint` passes with zero warnings
- [ ] All existing tests pass
- [ ] File tree search auto-expansion works without performance issues
- [ ] Chat input functionality unchanged (file picker, slash commands, permission modes)
- [ ] No console errors in browser during manual testing

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/web && pnpm build
# Expected: Build completes successfully, no errors

# Type checking
cd apps/web && pnpm check-types
# Expected: No TypeScript errors, especially no 'any' type errors

# Linting
cd apps/web && pnpm lint
# Expected: No ESLint errors or warnings

# Unit tests
cd apps/web && pnpm test
# Expected: All tests pass, including updated ChatPromptInput tests

# Check for relative imports (should find 0)
grep -r "from ['\"]\.\./" apps/web/src/client/pages/projects/sessions/components/session/claude/
grep -r "from ['\"]\.\./" apps/web/src/client/pages/projects/git/components/
# Expected: No matches found
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: http://localhost:5173
3. **Test Session Chat**:
   - Go to a project session
   - Open chat input
   - Click file picker - verify it opens and allows file selection
   - Type `/` - verify slash command popover appears
   - Click permission mode selector - verify modes displayed
   - Type message and submit - verify it works
4. **Test File Tree**:
   - Go to Files page
   - Enter search query
   - Verify matching directories auto-expand
   - Clear search - verify tree resets
   - Toggle directories - verify expand/collapse works
5. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify ChatPromptInput focus management still works (parent can call `.focus()`)
- Verify FileTree performance: search with 100+ files should expand smoothly
- Check WebSocket connection still works with new SessionConfig type
- Verify permission modes persist across component re-renders
- Test keyboard shortcuts in chat input (Enter to submit, Shift+Enter for newline)

## Implementation Notes

### 1. Preserve Existing Functionality

This is a **refactoring**, not a feature change. Every interaction should work identically before and after. Run the app frequently during development to catch regressions early.

### 2. Import Path Patterns

When fixing imports, follow these patterns:
- Session claude blocks: `@/client/pages/projects/sessions/components/...`
- Git components: `@/client/pages/projects/git/components/...`
- Shared components: `@/client/components/...`
- Hooks: `@/client/hooks/...` or `@/client/pages/.../hooks/...`
- Types: `@/shared/types/...`

### 3. Component Extraction Strategy

When extracting components:
1. Start with the smallest, most isolated piece first
2. Ensure it compiles before moving to next extraction
3. Keep props interfaces explicit and well-typed
4. Maintain existing prop names where possible for easier migration

### 4. State Management in Hooks

When extracting state to custom hooks:
- Return objects with named properties, not arrays
- Group related state and handlers together
- Add comprehensive JSDoc comments
- Consider using `useCallback` for handlers to prevent unnecessary re-renders

### 5. Testing During Refactoring

After each task group:
- Run `pnpm check-types` to catch type errors immediately
- Run `pnpm test` to ensure no test regressions
- Start dev server and manually test affected components
- Check browser console for warnings

## Dependencies

- No new dependencies required
- Uses existing React, TypeScript, Zustand, and testing libraries

## Timeline

| Task                              | Estimated Time |
| --------------------------------- | -------------- |
| Import Path Standardization       | 1 hour         |
| Type Safety Improvements          | 0.5 hours      |
| Utility Consolidation             | 0.5 hours      |
| FileTree Performance Optimization | 0.5 hours      |
| ChatPromptInput Refactoring       | 2.5 hours      |
| FileTree Refactoring              | 2 hours        |
| Testing & Validation              | 1 hour         |
| **Total**                         | **6-8 hours**  |

## References

- CLAUDE.md - Project guidelines and best practices
- React Hooks Documentation - https://react.dev/reference/react
- Zustand Documentation - https://docs.pmnd.rs/zustand
- Frontend Audit Report - Generated 2025-10-30

## Next Steps

1. Start with Task Group 1 (Import Path Standardization) - lowest risk, highest impact
2. Move to Task Group 2 (Type Safety) - quick win
3. Complete Task Group 3 (Utilities) - sets up for later refactoring
4. Tackle Task Group 4 (FileTree Performance) - isolated change
5. Execute Task Groups 5-7 (ChatPromptInput) - largest refactor
6. Finish with Task Group 8 (FileTree Refactoring) - second largest refactor
7. Run full validation suite
8. Manual testing of all affected features
9. Update spec status to "completed"
10. Consider tackling ProjectSession.tsx refactoring in a separate spec
