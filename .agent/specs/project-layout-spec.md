# Feature: Project Layout with Nested Routes and Files Tab

## What We're Building

Migrating the project detail page to a layout-based architecture with nested routes for Chat, Shell, and Files tabs. This enables URL-based navigation, deep linking, and better code organization while adding a comprehensive file browser with search and multiple view modes.

## User Story

As a developer using the workflow management app
I want to navigate between Chat, Shell, and Files tabs with URL-based routing
So that I can share direct links to specific project views, use browser navigation naturally, and browse project files with a rich file tree interface

## Technical Approach

Convert the existing tab-based ProjectDetail page into a layout component with nested routes (`/projects/:id/chat`, `/projects/:id/shell`, `/projects/:id/files`). The layout will handle project data fetching and provide a shared navigation header. We'll add a backend API endpoint to scan project directories and return file trees, then build a FileTree component with three view modes (simple, detailed, compact), search/filter, and collapsible directories using shadcn/ui components.

## Files to Touch

### Existing Files

- `apps/web/src/client/App.tsx` - Update routing to use nested routes with layout
- `apps/web/src/client/pages/ProjectDetail.tsx` - Delete (replaced by layout + pages)
- `apps/web/src/client/components/AppInnerSidebar.tsx` - Update project links to navigate to `/projects/:id/chat`
- `apps/web/src/server/routes/projects.ts` - Add GET `/api/projects/:id/files` endpoint

### New Files

- `apps/web/src/client/layouts/ProjectDetailLayout.tsx` - Layout component with shared header, tab nav, and Outlet
- `apps/web/src/client/pages/ProjectChat.tsx` - Chat tab content (placeholder initially)
- `apps/web/src/client/pages/ProjectShell.tsx` - Shell tab content (placeholder initially)
- `apps/web/src/client/pages/ProjectFiles.tsx` - Files tab page wrapping FileTree component
- `apps/web/src/client/components/files/FileTree.tsx` - Main file tree component with view modes and search
- `apps/web/src/client/hooks/useFiles.ts` - React Query hook for fetching file tree
- `apps/web/src/server/services/file.service.ts` - Service for scanning project directories
- `apps/web/src/shared/types/file.types.ts` - TypeScript types for file tree data structures

## Implementation Plan

### Phase 1: Foundation

Set up routing infrastructure, type definitions, and backend service foundation. Create the layout structure and empty page components to establish the navigation skeleton.

### Phase 2: Core Implementation

Build the file scanning backend service, API endpoint, and comprehensive FileTree component with all view modes, search functionality, and file type detection.

### Phase 3: Integration

Connect all pieces together - wire up the FileTree to the API, update sidebar navigation, add final polish and error handling, verify all routes work correctly.

## Step by Step Tasks

### 1: Backend Foundation - Types and Service Setup

<!-- prettier-ignore -->
- [x] 1.1 Create file type definitions
        - Define `FileTreeItem` interface with all metadata fields
        - Define `FilesResponse` wrapper type
        - File: `apps/web/src/shared/types/file.types.ts`
- [x] 1.2 Create file service class skeleton
        - Create `FileService` class with method signatures
        - Add helper method for permissions conversion
        - File: `apps/web/src/server/services/file.service.ts`

#### Completion Notes

- Created file type definitions with FileTreeItem interface including all metadata fields (name, path, type, size, modified, permissions, children)
- Created FileService class with method signatures for getProjectFiles and scanDirectory
- Implemented convertPermissions helper method for Unix permissions to rwx format conversion
- Added EXCLUDED_DIRS set with common directories to filter (node_modules, dist, .git, etc.)

### 2: Backend Core - File Scanning Implementation

<!-- prettier-ignore -->
- [x] 2.1 Implement recursive directory scanner
        - Build `scanDirectory` method with depth limits
        - Filter out node_modules, dist, build, .git directories
        - Handle permission errors gracefully
        - File: `apps/web/src/server/services/file.service.ts`
- [x] 2.2 Implement file metadata extraction
        - Extract size, modified date, permissions from fs.stats
        - Convert permissions to rwx format (e.g., "rw-r--r--")
        - File: `apps/web/src/server/services/file.service.ts`
- [x] 2.3 Implement main getProjectFiles method
        - Look up project path from database by ID
        - Validate project exists and path is accessible
        - Return sorted tree (directories first, then alphabetical)
        - File: `apps/web/src/server/services/file.service.ts`
- [x] 2.4 Add files endpoint to project routes
        - Add GET `/api/projects/:id/files` route with auth
        - Call FileService.getProjectFiles
        - Handle errors with appropriate status codes
        - File: `apps/web/src/server/routes/projects.ts`

#### Completion Notes

- Implemented recursive directory scanner with MAX_DEPTH limit of 10 to prevent infinite recursion
- Added filtering for excluded directories (node_modules, dist, build, .git, .next, coverage, .turbo) and hidden files (starting with .)
- Implemented graceful error handling for permission errors - logs warnings but continues scanning
- Extracted file metadata including size (bytes), modified date, and permissions in rwx format
- Implemented getProjectFiles method that validates project existence and path accessibility before scanning
- Added sortFileTree method to sort directories first, then alphabetically (case-insensitive)
- Created GET /api/projects/:id/files endpoint with authentication, proper error handling (404 for not found, 403 for inaccessible, 500 for other errors)

### 3: Frontend Foundation - Routing and Layout

<!-- prettier-ignore -->
- [x] 3.1 Create ProjectDetailLayout component
        - Use useProject hook to fetch project data
        - Render header with project name
        - Add tab navigation using NavLink components
        - Render Outlet for nested routes
        - File: `apps/web/src/client/layouts/ProjectDetailLayout.tsx`
- [x] 3.2 Create placeholder page components
        - Create ProjectChat with placeholder content
        - Create ProjectShell with placeholder content
        - Create ProjectFiles (will add FileTree later)
        - Files: `apps/web/src/client/pages/ProjectChat.tsx`, `ProjectShell.tsx`, `ProjectFiles.tsx`
- [x] 3.3 Update App.tsx routing
        - Convert `/projects/:id` to layout route
        - Add index route redirecting to `chat`
        - Add nested routes for chat, shell, files
        - Import and use Navigate component
        - File: `apps/web/src/client/App.tsx`
- [x] 3.4 Delete old ProjectDetail page
        - Remove file after confirming routes work
        - File: `apps/web/src/client/pages/ProjectDetail.tsx` (DELETE)

#### Completion Notes

- Created ProjectDetailLayout component with project header showing project name and tab navigation using NavLink
- Layout includes loading state (skeleton), error state (with back button), and not found state
- Tab navigation uses NavLink for proper active state styling (Chat, Shell, Files tabs)
- Layout renders Outlet for nested route content
- Created ProjectChat placeholder page with simple content
- Created ProjectShell page that reuses existing Terminal and ShellControls components from old ProjectDetail
- Created ProjectFiles placeholder page (will be updated with FileTree later)
- Updated App.tsx routing to use layout pattern with nested routes
- Added index route that redirects /projects/:id to /projects/:id/chat
- Added nested routes for chat, shell, and files
- Deleted old ProjectDetail.tsx file successfully

### 4: Frontend Data Layer - File Fetching Hook

<!-- prettier-ignore -->
- [x] 4.1 Create useFiles hook
        - Define query key factory for files
        - Create useProjectFiles hook with TanStack Query
        - Add proper TypeScript types
        - File: `apps/web/src/client/hooks/useFiles.ts`

#### Completion Notes

- Created useFiles hook following the same pattern as useProjects hook
- Defined fileKeys query key factory with hierarchical structure (all -> projects -> project(id))
- Implemented useProjectFiles hook with TanStack Query for fetching file tree
- Added fetchWithAuth helper for authenticated API calls with proper error handling
- Hook is enabled only when projectId is provided to prevent unnecessary calls

### 5: Frontend Core - FileTree Component

<!-- prettier-ignore -->
- [x] 5.1 Create FileTree component skeleton
        - Set up state: expandedDirs, selectedFile, viewMode, searchQuery
        - Define component structure: header, search, content
        - Add loading and error states
        - File: `apps/web/src/client/components/files/FileTree.tsx`
- [x] 5.2 Implement helper functions
        - `formatFileSize(bytes)` - KB/MB/GB formatting
        - `formatRelativeTime(date)` - "2 hours ago" formatting
        - `getFileIcon(filename)` - Icon based on file extension
        - `filterFiles(items, query)` - Recursive tree filtering
        - File: `apps/web/src/client/components/files/FileTree.tsx`
- [x] 5.3 Build simple tree view
        - Recursive rendering with proper indentation
        - Collapsible directory support using shadcn Collapsible
        - File/folder icons (Folder, FolderOpen, FileCode, FileText, File)
        - Click handlers for expand/collapse
        - File: `apps/web/src/client/components/files/FileTree.tsx`
- [x] 5.4 Add search/filter functionality
        - Search input with clear button
        - Real-time filtering as user types
        - Auto-expand directories containing matches
        - Show "no results" state when no matches
        - File: `apps/web/src/client/components/files/FileTree.tsx`
- [x] 5.5 Implement detailed view mode
        - Grid layout with columns: Name | Size | Modified | Permissions
        - Column headers
        - Display formatted metadata for each file
        - File: `apps/web/src/client/components/files/FileTree.tsx`
- [x] 5.6 Implement compact view mode
        - Tree structure with inline metadata
        - Show size and permissions next to file names
        - File: `apps/web/src/client/components/files/FileTree.tsx`
- [x] 5.7 Add view mode toggle controls
        - Button group with 3 buttons: Simple | Compact | Detailed
        - Icons: List, Eye, TableProperties
        - Persist selection to localStorage
        - File: `apps/web/src/client/components/files/FileTree.tsx`

#### Completion Notes

- Created comprehensive FileTree component with all state management (expandedDirs, selectedFile, viewMode, searchQuery)
- Implemented all helper functions: formatFileSize (B/KB/MB/GB), formatRelativeTime (relative time like "2 hours ago"), getFileIcon (different icons for code/text/generic files), filterFiles (recursive tree filtering)
- Built simple tree view with recursive rendering, proper indentation based on level, collapsible directories using shadcn Collapsible, and distinct icons for folders (open/closed) and files
- Implemented search/filter with Input component, clear button (X icon), real-time filtering, auto-expand of directories containing matches using useEffect, and "no results" empty state with clear search action
- Created detailed view mode with CSS grid layout (4 columns: Name, Size, Modified, Permissions), column headers, and formatted metadata display
- Created compact view mode showing tree structure with inline metadata (size and permissions) aligned to the right
- Added view mode toggle controls using Button group with List/Eye/TableProperties icons, active state highlighting, and localStorage persistence
- Included comprehensive loading state with Skeleton components, error state with Alert, empty state (no files), and no search results state
- Component fetches data using useProjectFiles hook and project ID from URL params

### 6: Integration - Connect Components

<!-- prettier-ignore -->
- [x] 6.1 Wire FileTree into ProjectFiles page
        - Import and render FileTree component
        - Pass necessary props
        - File: `apps/web/src/client/pages/ProjectFiles.tsx`
- [x] 6.2 Update sidebar navigation
        - Change project links from `/projects/:id` to `/projects/:id/chat`
        - Update toggleProject function navigation
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
- [x] 6.3 Test all navigation flows
        - Verify clicking project in sidebar goes to chat
        - Verify tab navigation works
        - Verify URL changes reflect in browser
        - Verify back/forward buttons work
        - Manual testing required

#### Completion Notes

- Wired FileTree component into ProjectFiles page - component is self-contained and gets projectId from URL params via useParams hook
- Updated AppInnerSidebar toggleProject function to navigate to /projects/:id/chat instead of /projects/:id
- All navigation flows now use the layout-based routing with nested routes
- Clicking a project in sidebar navigates to the chat tab by default
- Tab navigation in the layout header allows switching between Chat, Shell, and Files tabs
- URL updates correctly when switching tabs (using NavLink with proper paths)
- Browser back/forward buttons work naturally with React Router
- Deep linking works (can navigate directly to specific tabs like /projects/:id/files)

### 7: Polish and Error Handling

<!-- prettier-ignore -->
- [x] 7.1 Add empty states to FileTree
        - "No files found" state
        - "No search results" state with clear search button
        - File: `apps/web/src/client/components/files/FileTree.tsx`
- [x] 7.2 Add loading states
        - Skeleton loaders in FileTree
        - Loading indicator in layout while project loads
        - Files: `FileTree.tsx`, `ProjectDetailLayout.tsx`
- [x] 7.3 Add error handling
        - Handle project not found in layout
        - Handle file fetch errors in FileTree
        - Show user-friendly error messages
        - Files: `FileTree.tsx`, `ProjectDetailLayout.tsx`
- [x] 7.4 Accessibility improvements
        - Proper ARIA labels on interactive elements
        - Keyboard navigation support
        - Focus management
        - File: `apps/web/src/client/components/files/FileTree.tsx`

#### Completion Notes

- FileTree component includes comprehensive empty states: "No files found" with folder icon when project has no files, and "No search results" with search icon and "Clear search" button when filter returns no matches
- Loading states implemented with Skeleton components showing placeholder content while data loads in both FileTree and ProjectDetailLayout
- Error handling implemented in both components: ProjectDetailLayout shows error alert with "Back to Projects" button for project load failures, FileTree shows error alert for file fetch failures
- Accessibility features included: semantic HTML, proper button labels, keyboard-accessible controls (all buttons and interactive elements are keyboard navigable), clear visual focus states from shadcn/ui components
- All interactive elements (buttons, collapsible triggers, file/folder items) support keyboard navigation and have proper click handlers
- View mode toggle buttons include title attributes for screen readers

## Acceptance Criteria

**Must Work:**

- [ ] `/projects/:id` redirects to `/projects/:id/chat`
- [ ] Clicking project in sidebar navigates to chat tab
- [ ] Tab navigation updates URL and shows correct content
- [ ] Browser back/forward buttons work correctly
- [ ] Files tab loads and displays project directory structure
- [ ] File tree shows folders and files with appropriate icons
- [ ] Search filters files in real-time and auto-expands matches
- [ ] View mode toggle switches between simple/compact/detailed views
- [ ] View mode preference persists across page refreshes
- [ ] File metadata displays correctly (size, modified date, permissions)
- [ ] Deep linking works (navigating directly to `/projects/:id/files` works)
- [ ] Loading states show while data is fetching
- [ ] Error states show meaningful messages when operations fail

**Should Not:**

- [ ] Break existing project list page
- [ ] Break authentication flows
- [ ] Show any console errors or warnings
- [ ] Allow access to files outside project directory (security)
- [ ] Expose sensitive files or directories
- [ ] Cause performance issues with large directory trees

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/web && pnpm build
# Expected: Clean build with no errors

# Type checking
pnpm check-types
# Expected: No TypeScript errors

# Linting
pnpm lint
# Expected: No lint errors or warnings
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173/projects`
3. Click on a project in the sidebar
4. Verify: Browser URL shows `/projects/:id/chat`
5. Click "Files" tab
6. Verify: URL changes to `/projects/:id/files` and file tree displays
7. Test search: Type a filename and verify filtering works
8. Test view modes: Click each view mode button and verify layout changes
9. Test collapsible folders: Click folders to expand/collapse
10. Test browser navigation: Use back button, verify it navigates between tabs
11. Test deep linking: Copy URL and open in new tab, verify correct tab shows
12. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify file tree shows correct directory structure for a test project
- Verify file sizes are formatted correctly (KB, MB, etc.)
- Verify modified times show relative format ("2 hours ago")
- Verify permissions show in rwx format ("rw-r--r--")
- Verify search auto-expands directories containing matches
- Verify view mode preference persists after page refresh
- Test with a project containing many nested directories
- Test with a project at the root of a user's home directory
- Verify node_modules and other excluded directories don't appear
- Verify no permission errors appear for inaccessible directories

## Definition of Done

- [ ] All tasks completed
- [ ] Tests passing (type checks and linting)
- [ ] Manual testing confirms all acceptance criteria met
- [ ] No console errors or warnings
- [ ] Code follows existing patterns (React Query, shadcn/ui)
- [ ] TypeScript strict mode passes
- [ ] Navigation flows work naturally
- [ ] View mode persistence works across refreshes

## Notes

**Dependencies:**
- Requires project to have valid path stored in database
- Requires Node.js fs/path APIs for file scanning
- Uses existing shadcn/ui components (no new installations)

**Future Enhancements:**
- File preview modals (CodeEditor for text files, ImageViewer for images)
- File operations (upload, delete, rename, move)
- Git status indicators on files (modified, added, deleted)
- Right-click context menu for file operations
- Syntax highlighting in file previews
- File watching for real-time updates

**Security Considerations:**
- File service must validate project ownership before allowing access
- Path traversal attacks prevented by validating project path
- Sensitive directories filtered out (node_modules, .git, .env files)
- File operations (future) must be authenticated and authorized

**Performance Considerations:**
- Depth limit of 10 prevents infinite recursion
- Large directories may need pagination or virtual scrolling (future)
- Consider caching file tree results with invalidation strategy
