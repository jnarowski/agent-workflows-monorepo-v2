# Feature: File Picker for Chat Prompt

## What We're Building

A file reference system that allows users to type `@` in the chat prompt to search and insert file paths from the current project. Uses fuzzy search (Fuse.js) for quick file discovery and displays files with a clean UI showing filename and directory path. Automatically tracks which files are referenced in the prompt.

## User Story

As a chat user
I want to quickly reference project files by typing `@` and searching
So that I can easily add file context to my prompts without manually typing full paths

## Technical Approach

Extract project ID from URL params, fetch file tree via existing API (`/api/projects/:id/files`), flatten the tree structure, and implement fuzzy search using Fuse.js. Use a controlled Popover component that opens on `@` trigger or button click. Parse textarea content to track added files, insert paths at cursor position, and support removal of all file occurrences. Component structure separates concerns: ChatPromptInput manages state/logic, ChatPromptInputFiles handles UI/search.

## Files to Touch

### Existing Files

- `apps/web/src/client/components/chat/ChatPromptInput.tsx` - Add project ID extraction, cursor tracking, file insertion/removal logic
- `apps/web/src/client/components/chat/ChatPromptInputFiles.tsx` - Major refactor to add file fetching, fuzzy search, and two-section UI
- `apps/web/package.json` - Add fuse.js dependency

### New Files

- `apps/web/src/client/lib/fileUtils.ts` - Utility functions for file operations (flatten tree, parse references, cursor insertion)
- `apps/web/src/client/lib/fileUtils.test.ts` - Unit tests for file utilities
- `apps/web/src/client/components/ui/file-badge.tsx` - File type badge component with color mapping
- `apps/web/src/client/components/ui/file-badge.test.tsx` - Unit tests for file badge
- `apps/web/src/client/components/chat/ChatPromptInput.test.tsx` - Integration tests for prompt input
- `apps/web/src/client/components/chat/ChatPromptInputFiles.test.tsx` - Integration tests for file picker

## Implementation Plan

### Phase 1: Foundation

Create utility functions and types for file operations. Set up file tree flattening, path parsing, cursor position manipulation, and file type detection. Install Fuse.js dependency. Create comprehensive unit tests to ensure all utilities work correctly before integration.

### Phase 2: Core Implementation

Build the file badge component for visual file type indicators. Update ChatPromptInput to track cursor position and manage file insertion/removal. Refactor ChatPromptInputFiles to fetch files from API, implement Fuse.js search, and build the two-section UI (Added Files + Search Results) matching the design specification.

### Phase 3: Integration

Connect all pieces together, ensure proper data flow from parent to child components, handle edge cases (empty projects, API errors, special characters), add keyboard navigation, and validate the complete user flow from typing `@` to inserting file paths.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Install Dependencies

<!-- prettier-ignore -->
- [ ] 1.1 Install Fuse.js for fuzzy searching
        - Run: `cd apps/web && pnpm add fuse.js`
        - Expected: fuse.js added to package.json dependencies
- [ ] 1.2 Install testing dependencies (if not already installed)
        - Run: `cd apps/web && pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest @vitest/ui jsdom`
        - Expected: Testing libraries added to devDependencies
        - Note: Skip if already installed

#### Completion Notes

### 2: Create File Utilities

<!-- prettier-ignore -->
- [ ] 2.1 Create fileUtils.ts with TypeScript types
        - File: `apps/web/src/client/lib/fileUtils.ts`
        - Define `FileItem` interface with: filename, directory, fullPath, extension
        - Define `FileTypeInfo` interface with: label, color
- [ ] 2.2 Implement flattenFileTree function
        - Recursively traverse FileTreeItem[] structure
        - Extract filename from path (last segment)
        - Extract directory from path (all but last segment)
        - Extract extension from filename (after last dot)
        - Return flat array of FileItem objects
- [ ] 2.3 Implement extractFileReferences function
        - Use regex: `/[a-zA-Z0-9\/\.\-_]+\.[a-z]{2,4}/g` to match file paths
        - Parse textarea content and extract all matching paths
        - Return array of unique file paths
        - Handle empty string edge case
- [ ] 2.4 Implement insertAtCursor function
        - Take current text, insertion string, and cursor position
        - Split text at cursor position
        - Insert new string between parts
        - Calculate new cursor position (after inserted text)
        - Return object with new text and cursor position
- [ ] 2.5 Implement removeAllOccurrences function
        - Use global string replacement to remove all instances
        - Use regex escape to handle special characters in path
        - Return modified text with all occurrences removed
- [ ] 2.6 Implement getFileTypeInfo function
        - Map extensions to file type info (label and color)
        - TS/TSX: label "TS", color "rgb(59, 130, 246)" (blue)
        - JS/JSX: label "JS", color "rgb(234, 179, 8)" (yellow)
        - JSON: label "JSON", color "rgb(107, 114, 128)" (gray)
        - MD: label "MD", color "rgb(34, 197, 94)" (green)
        - Default: label "FILE", color "rgb(156, 163, 175)" (light gray)

#### Completion Notes

### 3: Write Unit Tests for File Utilities

<!-- prettier-ignore -->
- [ ] 3.1 Create fileUtils.test.ts
        - File: `apps/web/src/client/lib/fileUtils.test.ts`
        - Setup test imports and describe blocks
- [ ] 3.2 Test flattenFileTree
        - Test: Empty tree returns empty array
        - Test: Single file extracts correct properties
        - Test: Nested directories flatten correctly
        - Test: Deep nesting (3+ levels) works
        - Test: Multiple files in same directory
- [ ] 3.3 Test extractFileReferences
        - Test: Finds single file path in text
        - Test: Finds multiple file paths
        - Test: Returns empty array for no matches
        - Test: Handles paths with hyphens and underscores
        - Test: Doesn't match incomplete paths
- [ ] 3.4 Test insertAtCursor
        - Test: Insert at position 0 (beginning)
        - Test: Insert at middle position
        - Test: Insert at end position
        - Test: Returns correct new cursor position
        - Test: Handles empty string
- [ ] 3.5 Test removeAllOccurrences
        - Test: Removes single occurrence
        - Test: Removes multiple occurrences
        - Test: Returns unchanged if path not found
        - Test: Doesn't remove partial matches
        - Test: Handles special characters in path
- [ ] 3.6 Test getFileTypeInfo
        - Test: Returns correct info for .ts, .tsx
        - Test: Returns correct info for .js, .jsx
        - Test: Returns correct info for .json, .md
        - Test: Returns default for unknown extension
- [ ] 3.7 Run utility tests
        - Run: `cd apps/web && pnpm test fileUtils.test.ts`
        - Expected: All tests pass, 100% coverage

#### Completion Notes

### 4: Create File Badge Component

<!-- prettier-ignore -->
- [ ] 4.1 Create file-badge.tsx component
        - File: `apps/web/src/client/components/ui/file-badge.tsx`
        - Accept extension prop (string)
        - Use getFileTypeInfo to get label and color
        - Render badge with fixed width (w-12), centered text
        - Apply background color with opacity (bg-opacity-20)
        - Apply text color for label
        - Use rounded corners and small text
- [ ] 4.2 Create file-badge.test.tsx
        - File: `apps/web/src/client/components/ui/file-badge.test.tsx`
        - Test: Renders correct label for each file type
        - Test: Applies correct color classes
        - Test: Has consistent width for all types
        - Test: Handles unknown extension
- [ ] 4.3 Run badge component tests
        - Run: `cd apps/web && pnpm test file-badge.test.tsx`
        - Expected: All tests pass

#### Completion Notes

### 5: Update ChatPromptInput Component

<!-- prettier-ignore -->
- [ ] 5.1 Add imports to ChatPromptInput.tsx
        - File: `apps/web/src/client/components/chat/ChatPromptInput.tsx`
        - Import useParams from react-router-dom
        - Import fileUtils functions (insertAtCursor, removeAllOccurrences)
- [ ] 5.2 Extract project ID from URL
        - Use useParams<{ id: string }>() hook
        - Extract id from params
- [ ] 5.3 Add cursor position state
        - Add state: cursorPosition: number, default 0
        - Track in handleTextChange: e.target.selectionStart
        - Update cursorPosition state on every change
- [ ] 5.4 Create handleFileSelect callback
        - Accept filePath parameter (string)
        - Call insertAtCursor with current text, filePath, cursorPosition
        - Update text state with new text
        - Update cursorPosition with new position
        - Close @ menu: setIsAtMenuOpen(false)
        - Refocus textarea with new cursor position
- [ ] 5.5 Create handleFileRemove callback
        - Accept filePath parameter (string)
        - Call removeAllOccurrences with current text and filePath
        - Update text state with cleaned text
        - Keep menu open for immediate feedback
- [ ] 5.6 Pass props to ChatPromptInputFiles
        - Pass projectId={id!}
        - Pass onFileSelect={handleFileSelect}
        - Pass onFileRemove={handleFileRemove}
        - Pass textareaValue={text}

#### Completion Notes

### 6: Refactor ChatPromptInputFiles Component

<!-- prettier-ignore -->
- [ ] 6.1 Update ChatPromptInputFiles props interface
        - File: `apps/web/src/client/components/chat/ChatPromptInputFiles.tsx`
        - Add projectId: string
        - Add onFileSelect: (filePath: string) => void
        - Add onFileRemove: (filePath: string) => void
        - Add textareaValue: string
- [ ] 6.2 Add imports
        - Import useProjectFiles from @/client/hooks/useFiles
        - Import Fuse from fuse.js
        - Import flattenFileTree, extractFileReferences from fileUtils
        - Import FileTypeBadge component
        - Import useMemo, useEffect hooks
- [ ] 6.3 Fetch project files
        - Use useProjectFiles(projectId) hook
        - Store in: data, isLoading, error
- [ ] 6.4 Flatten file tree
        - Use useMemo to flatten when data changes
        - Call flattenFileTree(data || [])
        - Store in: flattenedFiles
- [ ] 6.5 Setup Fuse.js search
        - Create Fuse instance in useMemo
        - Keys: filename (weight 0.7), fullPath (weight 0.3)
        - Threshold: 0.4
        - includeScore: true
        - Store in: fuse
- [ ] 6.6 Parse added files when menu opens
        - Add useEffect with dependency on [open, textareaValue]
        - When open is true, call extractFileReferences(textareaValue)
        - Store results in local state: addedFiles (string[])
- [ ] 6.7 Implement search filtering
        - Add searchQuery state (string)
        - If searchQuery is empty, show all files
        - Otherwise, use fuse.search(searchQuery)
        - Extract items from Fuse results
        - Store in: filteredFiles
- [ ] 6.8 Update UI structure
        - Keep existing Popover, PopoverTrigger, PopoverContent
        - Inside PopoverContent, render PromptInputCommand
        - PromptInputCommandInput with ref, onChange for searchQuery
        - PromptInputCommandList for results
- [ ] 6.9 Render "Added Files" section
        - Show PromptInputCommandGroup heading="Added Files"
        - Only render if addedFiles.length > 0
        - Map over addedFiles
        - For each file, find FileItem from flattenedFiles
        - Render PromptInputCommandItem with:
          - FileTypeBadge with extension
          - Filename in bold
          - Directory path in muted color (text-muted-foreground text-xs)
          - Checkmark icon on right
          - onClick calls onFileRemove(file.fullPath)
- [ ] 6.10 Render "Search Results" section
        - Show PromptInputCommandSeparator if addedFiles exist
        - Show PromptInputCommandGroup heading="Search Results"
        - Map over filteredFiles
        - Filter out files already in addedFiles
        - Render PromptInputCommandItem with:
          - FileTypeBadge with extension
          - Filename in bold (font-medium)
          - Directory path in muted color (text-muted-foreground text-xs ml-2)
          - Use flex justify-between for layout
          - onClick calls onFileSelect(file.fullPath)
- [ ] 6.11 Handle loading and error states
        - Show skeleton/loading indicator when isLoading
        - Show error message when error exists
        - Show "No files found" when flattenedFiles is empty

#### Completion Notes

### 7: Write Integration Tests

<!-- prettier-ignore -->
- [ ] 7.1 Create ChatPromptInput.test.tsx
        - File: `apps/web/src/client/components/chat/ChatPromptInput.test.tsx`
        - Mock useParams to return { id: 'test-project' }
        - Test: Opens @ menu when @ is typed
        - Test: Closes @ menu after file selection
        - Test: Inserts file path at cursor position
        - Test: Removes @ symbol when inserting
        - Test: Tracks cursor position correctly
        - Test: Removes all occurrences on file removal
- [ ] 7.2 Create ChatPromptInputFiles.test.tsx
        - File: `apps/web/src/client/components/chat/ChatPromptInputFiles.test.tsx`
        - Mock useProjectFiles hook with sample data
        - Test: Renders loading state
        - Test: Renders error state
        - Test: Displays flattened file list
        - Test: Filters with fuzzy search
        - Test: Calls onFileSelect when clicked
        - Test: Shows "Added Files" section
        - Test: Calls onFileRemove when unchecked
- [ ] 7.3 Run integration tests
        - Run: `cd apps/web && pnpm test ChatPromptInput`
        - Expected: All tests pass

#### Completion Notes

### 8: Manual Testing and Polish

<!-- prettier-ignore -->
- [ ] 8.1 Test @ trigger functionality
        - Start dev server
        - Navigate to project chat page
        - Type @ in prompt
        - Verify menu opens and search input is focused
- [ ] 8.2 Test fuzzy search
        - Type "pmpin" in search
        - Verify "ChatPromptInput.tsx" appears
        - Try other fuzzy patterns
        - Verify results are relevant
- [ ] 8.3 Test file insertion
        - Type @ and select a file
        - Verify path inserted at cursor (without @)
        - Verify cursor moves after inserted text
        - Test insertion at start, middle, end of text
- [ ] 8.4 Test file removal
        - Add same file multiple times in prompt
        - Open @ menu
        - Uncheck file in "Added Files" section
        - Verify ALL occurrences removed
- [ ] 8.5 Test menu behavior
        - Verify menu closes after file selection
        - Verify menu reopens with @
        - Verify "Added Files" section updates correctly
- [ ] 8.6 Test edge cases
        - Empty project (no files)
        - File with spaces in name
        - File with special characters
        - Very long file paths
        - API error handling
- [ ] 8.7 Test keyboard navigation
        - Arrow keys to navigate results
        - Enter to select
        - Escape to close menu
- [ ] 8.8 Polish styling
        - Verify badge colors match spec
        - Verify text truncation works
        - Verify spacing and alignment
        - Check responsive behavior

#### Completion Notes

## Acceptance Criteria

**Must Work:**

- [ ] Typing @ in chat prompt opens file picker menu
- [ ] Menu displays all project files in searchable list
- [ ] Fuzzy search filters files as user types (e.g., "pmpin" finds "ChatPromptInput.tsx")
- [ ] Clicking a file inserts its path at cursor position (replaces @)
- [ ] Menu closes automatically after file selection
- [ ] "Added Files" section shows files currently in prompt text
- [ ] Unchecking a file removes all its occurrences from prompt
- [ ] File badges show correct colors for different file types
- [ ] File paths are relative to project root
- [ ] Cursor position is maintained after insertion
- [ ] Menu search input auto-focuses when opened

**Should Not:**

- [ ] Break existing chat functionality
- [ ] Cause performance issues with large file trees (>1000 files)
- [ ] Insert @ symbol with file path
- [ ] Show duplicate files in search results
- [ ] Keep menu open after file selection
- [ ] Remove partial matches when unchecking files
- [ ] Crash on empty project or API errors

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/web && pnpm build
# Expected: Clean build with no errors

# Type checking
cd apps/web && pnpm check-types
# Expected: No TypeScript errors

# Linting
cd apps/web && pnpm lint
# Expected: No linting errors

# Unit tests
cd apps/web && pnpm test fileUtils.test.ts
# Expected: All utility tests pass (flattenFileTree, extractFileReferences, insertAtCursor, removeAllOccurrences, getFileTypeInfo)

cd apps/web && pnpm test file-badge.test.tsx
# Expected: All badge component tests pass

# Integration tests
cd apps/web && pnpm test ChatPromptInput.test.tsx
# Expected: All input integration tests pass (@ trigger, insertion, removal, cursor tracking)

cd apps/web && pnpm test ChatPromptInputFiles.test.tsx
# Expected: All file picker integration tests pass (loading, search, selection)

# Full test suite
cd apps/web && pnpm test
# Expected: All tests pass, coverage >80% for new code
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{project-id}/chat`
3. Type `@` in the chat prompt input
4. Verify: Menu opens with file list and focused search input
5. Type fuzzy search query (e.g., "pmpin")
6. Verify: Results filter to matching files (e.g., "ChatPromptInput.tsx")
7. Click a file from search results
8. Verify: File path inserted at cursor, @ removed, menu closes
9. Type multiple file paths manually in prompt
10. Open @ menu again
11. Verify: "Added Files" section shows all referenced files
12. Click checkmark to remove a file
13. Verify: All occurrences removed from prompt text
14. Test cursor insertion at different positions (start, middle, end)
15. Check console: No errors or warnings

**Feature-Specific Checks:**

- Test with empty project (no files): Should show "No files found" message
- Test with API error: Should display error state gracefully
- Test file with spaces: "my file.tsx" should work correctly
- Test very long path: Should truncate with ellipsis in UI
- Test rapid @ triggering: Menu should open/close smoothly
- Test fuzzy search edge cases: Single letter, symbols, numbers
- Test file badges: TS (blue), JS (yellow), JSON (gray), MD (green), other (light gray)
- Test "Added Files" parsing performance: Should parse in <100ms even with long prompt text
- Verify Fuse.js search performance: Should return results in <50ms

## Definition of Done

- [ ] All tasks completed in order
- [ ] Unit tests passing (fileUtils, file-badge)
- [ ] Integration tests passing (ChatPromptInput, ChatPromptInputFiles)
- [ ] Type checks pass with no errors
- [ ] Lint checks pass with no warnings
- [ ] Manual testing confirms all acceptance criteria
- [ ] No console errors during usage
- [ ] Code follows existing component patterns
- [ ] Fuzzy search works as expected (Fuse.js configured correctly)
- [ ] File badges render with correct colors
- [ ] "Added Files" section parses and displays correctly
- [ ] File insertion/removal works at all cursor positions
- [ ] Edge cases handled (empty project, API errors, special characters)
- [ ] Performance verified with large file trees

## Notes

- Uses existing `/api/projects/:id/files` API endpoint (already implemented)
- Reuses `useProjectFiles` hook from FileTree feature
- File tree structure is already typed in `@/shared/types/file.types.ts`
- Fuse.js configuration (threshold 0.4, weighted keys) balances fuzzy matching with accuracy
- Simple regex pattern for file path extraction is intentionally permissive
- Performance optimization: Only parse textarea for added files when menu opens
- Future consideration: Add keyboard shortcuts for file insertion (e.g., Ctrl+K)
- Future consideration: Show file preview on hover
- Future consideration: Group files by directory in search results
- Future consideration: Support glob patterns in search (e.g., "*.tsx")
