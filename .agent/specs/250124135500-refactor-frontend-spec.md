# Feature: Frontend Architecture Refactor and Cleanup

## What We're Building

A comprehensive cleanup and refactoring of the React frontend codebase to remove 61% of unused shadcn/ui components (33 of 54), eliminate dead code (5 unused pages), fix architectural violations (relative imports, React anti-patterns), and remove 93 console.log statements. This will reduce bundle size by ~160-215KB, improve maintainability, and align the codebase with established best practices.

## User Story

As a developer maintaining the frontend codebase
I want a clean, well-organized codebase with only used components and proper patterns
So that the application is faster, easier to maintain, and follows best practices

## Technical Approach

The refactor follows a phased approach from safest to riskiest changes:
1. Remove components and files with zero dependencies
2. Fix file organization and imports
3. Apply code quality improvements

All changes maintain backward compatibility and are verifiable through existing tests. The audit identified specific files and patterns to address, eliminating guesswork.

## Files to Touch

### Existing Files

**Import Updates (after moves/deletions):**
- `apps/web/src/client/layouts/ProjectDetailLayout.tsx` - Update ProjectHeader import
- `apps/web/src/client/providers/WebSocketProvider.tsx` - Update WebSocketContext import, fix React.FC
- `apps/web/src/client/components/AppInnerSidebar.tsx` - Fix relative imports
- `apps/web/src/client/pages/projects/sessions/components/ChatInterface.tsx` - Fix relative imports
- `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/WriteToolRenderer.tsx` - Fix relative imports
- `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/ReadToolRenderer.tsx` - Fix relative imports
- `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/EditToolRenderer.tsx` - Fix relative imports
- `apps/web/src/client/lib/api-client.ts` - Merge api.ts content
- `apps/web/src/client/components/ui/calendar.tsx` - Fix React.useEffect pattern
- `apps/web/src/client/components/ui/slider.tsx` - Fix React.useEffect pattern
- `apps/web/src/client/main.tsx` - Verify sonner/Toaster usage

**Console.log Cleanup (22 files):**
- `apps/web/src/client/providers/WebSocketProvider.tsx` - 22 statements
- `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx` - 14 statements
- `apps/web/src/client/pages/projects/shell/hooks/useShellWebSocket.ts` - 9 statements
- `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - 7 statements
- Plus 18 more files with 1-4 statements each

### New Files

- `apps/web/src/client/pages/projects/components/ProjectHeader.tsx` - Moved from components/
- `apps/web/src/client/providers/WebSocketContext.ts` - Moved from contexts/

### Files to Delete

**Dead Pages (5 files):**
- `apps/web/src/client/pages/ProjectDetail.tsx`
- `apps/web/src/client/pages/Shell.tsx`
- `apps/web/src/client/pages/Dashboard.tsx`
- `apps/web/src/client/pages/AboutUs.tsx`
- `apps/web/src/client/pages/LayoutExperiment.tsx`

**Unused UI Components (32 files after sonner verification):**
- `apps/web/src/client/components/ui/accordion.tsx`
- `apps/web/src/client/components/ui/alert.tsx`
- `apps/web/src/client/components/ui/aspect-ratio.tsx`
- `apps/web/src/client/components/ui/breadcrumb.tsx`
- `apps/web/src/client/components/ui/button-group.tsx`
- `apps/web/src/client/components/ui/calendar.tsx`
- `apps/web/src/client/components/ui/carousel.tsx`
- `apps/web/src/client/components/ui/chart.tsx`
- `apps/web/src/client/components/ui/context-menu.tsx`
- `apps/web/src/client/components/ui/drawer.tsx`
- `apps/web/src/client/components/ui/empty.tsx`
- `apps/web/src/client/components/ui/field.tsx`
- `apps/web/src/client/components/ui/form.tsx`
- `apps/web/src/client/components/ui/hover-card.tsx`
- `apps/web/src/client/components/ui/input-group.tsx`
- `apps/web/src/client/components/ui/input-otp.tsx`
- `apps/web/src/client/components/ui/item.tsx`
- `apps/web/src/client/components/ui/kbd.tsx`
- `apps/web/src/client/components/ui/menubar.tsx`
- `apps/web/src/client/components/ui/navigation-menu.tsx`
- `apps/web/src/client/components/ui/pagination.tsx`
- `apps/web/src/client/components/ui/progress.tsx`
- `apps/web/src/client/components/ui/radio-group.tsx`
- `apps/web/src/client/components/ui/resizable.tsx`
- `apps/web/src/client/components/ui/scroll-area.tsx`
- `apps/web/src/client/components/ui/select.tsx`
- `apps/web/src/client/components/ui/slider.tsx`
- `apps/web/src/client/components/ui/spinner.tsx`
- `apps/web/src/client/components/ui/switch.tsx`
- `apps/web/src/client/components/ui/textarea.tsx`
- `apps/web/src/client/components/ui/toggle.tsx`
- `apps/web/src/client/components/ui/toggle-group.tsx`

**Other Deletions:**
- `apps/web/src/client/lib/api.ts` - Merged into api-client.ts
- `apps/web/src/client/components/ProjectHeader.tsx` - Moved to pages/projects/components/
- `apps/web/src/client/contexts/WebSocketContext.ts` - Moved to providers/
- `apps/web/src/client/contexts/` - Empty directory after move

## Implementation Plan

### Phase 1: Safe Deletions

Remove files with zero dependencies - no risk of breaking changes. This includes unused UI components and dead pages that aren't referenced anywhere in the codebase.

### Phase 2: File Organization

Reorganize files to match the project's feature-based architecture. Move components to their proper locations and consolidate related files. Update imports to reflect new locations.

### Phase 3: Code Quality Improvements

Fix anti-patterns, remove console logs, clean up dead code. These changes improve code quality without changing functionality.

## Step by Step Tasks

### 1: Verify sonner Component Usage

<!-- prettier-ignore -->
- [ ] 1.1 Check if sonner.tsx is used by Toaster
        - Open `apps/web/src/client/main.tsx`
        - Check import: `import { Toaster } from "@/client/components/ui/sonner"`
        - If import exists: Keep sonner.tsx
        - If no import: Add sonner.tsx to deletion list
        - Update the unused components list accordingly

#### Completion Notes

### 2: Delete Dead Pages

<!-- prettier-ignore -->
- [ ] 2.1 Delete ProjectDetail.tsx
        - File: `apps/web/src/client/pages/ProjectDetail.tsx`
        - Verify not imported: `grep -r "ProjectDetail" apps/web/src/client`
        - Delete the file
- [ ] 2.2 Delete Shell.tsx
        - File: `apps/web/src/client/pages/Shell.tsx`
        - Verify not imported: `grep -r "from.*Shell\.tsx" apps/web/src/client`
        - Delete the file
- [ ] 2.3 Delete Dashboard.tsx
        - File: `apps/web/src/client/pages/Dashboard.tsx`
        - Check route usage in App.tsx first
        - If route exists, replace with redirect or remove route
        - Delete the file
- [ ] 2.4 Delete AboutUs.tsx
        - File: `apps/web/src/client/pages/AboutUs.tsx`
        - Check route usage in App.tsx first
        - If route exists, remove route
        - Delete the file
- [ ] 2.5 Delete LayoutExperiment.tsx
        - File: `apps/web/src/client/pages/LayoutExperiment.tsx`
        - Check route usage in App.tsx first
        - If route exists, remove route
        - Delete the file
- [ ] 2.6 Update App.tsx routes
        - File: `apps/web/src/client/App.tsx`
        - Remove any routes referencing deleted pages
        - Update root route redirect if needed

#### Completion Notes

### 3: Delete Unused UI Components

<!-- prettier-ignore -->
- [ ] 3.1 Delete accordion.tsx
        - File: `apps/web/src/client/components/ui/accordion.tsx`
        - Verified: Zero imports
- [ ] 3.2 Delete alert.tsx
        - File: `apps/web/src/client/components/ui/alert.tsx`
        - Verified: Zero imports
- [ ] 3.3 Delete aspect-ratio.tsx
        - File: `apps/web/src/client/components/ui/aspect-ratio.tsx`
        - Verified: Zero imports
- [ ] 3.4 Delete breadcrumb.tsx
        - File: `apps/web/src/client/components/ui/breadcrumb.tsx`
        - Verified: Zero imports
- [ ] 3.5 Delete button-group.tsx
        - File: `apps/web/src/client/components/ui/button-group.tsx`
        - Verified: Zero imports
- [ ] 3.6 Delete carousel.tsx
        - File: `apps/web/src/client/components/ui/carousel.tsx`
        - Verified: Zero imports
- [ ] 3.7 Delete chart.tsx
        - File: `apps/web/src/client/components/ui/chart.tsx`
        - Verified: Zero imports
- [ ] 3.8 Delete context-menu.tsx
        - File: `apps/web/src/client/components/ui/context-menu.tsx`
        - Verified: Zero imports
- [ ] 3.9 Delete drawer.tsx
        - File: `apps/web/src/client/components/ui/drawer.tsx`
        - Verified: Zero imports
- [ ] 3.10 Delete empty.tsx
        - File: `apps/web/src/client/components/ui/empty.tsx`
        - Verified: Zero imports
- [ ] 3.11 Delete field.tsx
        - File: `apps/web/src/client/components/ui/field.tsx`
        - Verified: Zero imports
- [ ] 3.12 Delete form.tsx
        - File: `apps/web/src/client/components/ui/form.tsx`
        - Verified: Zero imports
- [ ] 3.13 Delete hover-card.tsx
        - File: `apps/web/src/client/components/ui/hover-card.tsx`
        - Verified: Zero imports
- [ ] 3.14 Delete input-group.tsx
        - File: `apps/web/src/client/components/ui/input-group.tsx`
        - Verified: Only used once in ai-elements (excluded from changes)
        - Keep this file
- [ ] 3.15 Delete input-otp.tsx
        - File: `apps/web/src/client/components/ui/input-otp.tsx`
        - Verified: Zero imports
- [ ] 3.16 Delete item.tsx
        - File: `apps/web/src/client/components/ui/item.tsx`
        - Verified: Zero imports
- [ ] 3.17 Delete kbd.tsx
        - File: `apps/web/src/client/components/ui/kbd.tsx`
        - Verified: Zero imports
- [ ] 3.18 Delete menubar.tsx
        - File: `apps/web/src/client/components/ui/menubar.tsx`
        - Verified: Zero imports
- [ ] 3.19 Delete navigation-menu.tsx
        - File: `apps/web/src/client/components/ui/navigation-menu.tsx`
        - Verified: Zero imports
- [ ] 3.20 Delete pagination.tsx
        - File: `apps/web/src/client/components/ui/pagination.tsx`
        - Verified: Zero imports
- [ ] 3.21 Delete progress.tsx
        - File: `apps/web/src/client/components/ui/progress.tsx`
        - Verified: Zero imports
- [ ] 3.22 Delete radio-group.tsx
        - File: `apps/web/src/client/components/ui/radio-group.tsx`
        - Verified: Zero imports
- [ ] 3.23 Delete resizable.tsx
        - File: `apps/web/src/client/components/ui/resizable.tsx`
        - Verified: Zero imports
- [ ] 3.24 Delete scroll-area.tsx
        - File: `apps/web/src/client/components/ui/scroll-area.tsx`
        - Verified: Zero imports
- [ ] 3.25 Delete select.tsx
        - File: `apps/web/src/client/components/ui/select.tsx`
        - Verified: Zero imports
- [ ] 3.26 Delete spinner.tsx
        - File: `apps/web/src/client/components/ui/spinner.tsx`
        - Verified: Zero imports
- [ ] 3.27 Delete switch.tsx
        - File: `apps/web/src/client/components/ui/switch.tsx`
        - Verified: Zero imports
- [ ] 3.28 Delete textarea.tsx
        - File: `apps/web/src/client/components/ui/textarea.tsx`
        - Verified: Zero imports
- [ ] 3.29 Delete toggle.tsx
        - File: `apps/web/src/client/components/ui/toggle.tsx`
        - Verified: Zero imports
- [ ] 3.30 Delete toggle-group.tsx
        - File: `apps/web/src/client/components/ui/toggle-group.tsx`
        - Verified: Zero imports
- [ ] 3.31 Conditionally delete calendar.tsx and slider.tsx
        - Files: `apps/web/src/client/components/ui/calendar.tsx`, `slider.tsx`
        - These have React.useEffect issues but audit showed zero imports
        - Verify one more time, then delete if unused

#### Completion Notes

### 4: Reorganize Files

<!-- prettier-ignore -->
- [ ] 4.1 Create projects components directory
        - Create: `apps/web/src/client/pages/projects/components/` directory if it doesn't exist
- [ ] 4.2 Move ProjectHeader to projects
        - Move: `apps/web/src/client/components/ProjectHeader.tsx`
        - To: `apps/web/src/client/pages/projects/components/ProjectHeader.tsx`
- [ ] 4.3 Update ProjectHeader import in ProjectDetailLayout
        - File: `apps/web/src/client/layouts/ProjectDetailLayout.tsx`
        - Change: `from "@/client/components/ProjectHeader"`
        - To: `from "@/client/pages/projects/components/ProjectHeader"`
- [ ] 4.4 Move WebSocketContext to providers
        - Move: `apps/web/src/client/contexts/WebSocketContext.ts`
        - To: `apps/web/src/client/providers/WebSocketContext.ts`
- [ ] 4.5 Update WebSocketContext import in WebSocketProvider
        - File: `apps/web/src/client/providers/WebSocketProvider.tsx`
        - Change: `from '@/client/contexts/WebSocketContext'`
        - To: `from '@/client/providers/WebSocketContext'`
- [ ] 4.6 Search for other WebSocketContext imports
        - Run: `grep -r "from.*contexts/WebSocketContext" apps/web/src/client`
        - Update any found imports to use providers path
- [ ] 4.7 Delete empty contexts directory
        - Remove: `apps/web/src/client/contexts/` directory
        - Only if completely empty after moves

#### Completion Notes

### 5: Merge API Files

<!-- prettier-ignore -->
- [ ] 5.1 Copy getSessionMessages to api-client.ts
        - File: `apps/web/src/client/lib/api-client.ts`
        - Add the `getSessionMessages` function from api.ts
        - Keep all existing exports from api-client.ts
- [ ] 5.2 Find all imports of api.ts
        - Run: `grep -r "from '@/client/lib/api'" apps/web/src/client`
        - List all files that import from api.ts
- [ ] 5.3 Update imports to use api-client.ts
        - Change all: `from '@/client/lib/api'`
        - To: `from '@/client/lib/api-client'`
        - Verify imports still work (getSessionMessages, api)
- [ ] 5.4 Delete api.ts
        - File: `apps/web/src/client/lib/api.ts`
        - Only delete after all imports updated

#### Completion Notes

### 6: Fix Relative Imports

<!-- prettier-ignore -->
- [ ] 6.1 Fix AppInnerSidebar relative import
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Line: 3
        - Find relative import pattern (../)
        - Replace with @/client/ alias
- [ ] 6.2 Fix ChatInterface relative import
        - File: `apps/web/src/client/pages/projects/sessions/components/ChatInterface.tsx`
        - Line: 12
        - Change: `../../../../lib/agents`
        - To: `@/client/lib/agents`
- [ ] 6.3 Fix WriteToolRenderer relative import
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/WriteToolRenderer.tsx`
        - Line: 2
        - Find relative import
        - Replace with @/client/ alias
- [ ] 6.4 Fix ReadToolRenderer relative import
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/ReadToolRenderer.tsx`
        - Line: 1
        - Find relative import
        - Replace with @/client/ alias
- [ ] 6.5 Fix EditToolRenderer relative import
        - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/EditToolRenderer.tsx`
        - Line: 2
        - Find relative import
        - Replace with @/client/ alias
- [ ] 6.6 Search for any remaining relative imports
        - Run: `grep -r "from ['\"]\.\./" apps/web/src/client --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".agent"`
        - Fix any additional violations found

#### Completion Notes

### 7: Fix React Anti-patterns

<!-- prettier-ignore -->
- [ ] 7.1 Fix React.FC in WebSocketProvider
        - File: `apps/web/src/client/providers/WebSocketProvider.tsx`
        - Line: 21
        - Change: `export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {`
        - To: `export function WebSocketProvider({ children }: WebSocketProviderProps) {`
        - Update closing brace from `};` to `}`
- [ ] 7.2 Fix React.useEffect in calendar.tsx (if kept)
        - File: `apps/web/src/client/components/ui/calendar.tsx`
        - Only if file still exists after unused component deletion
        - Add to imports: `import { useEffect } from 'react'`
        - Replace: `React.useEffect` with `useEffect`
        - Remove: `import React from 'react'` if no longer needed
- [ ] 7.3 Fix React.useEffect in slider.tsx (if kept)
        - File: `apps/web/src/client/components/ui/slider.tsx`
        - Only if file still exists after unused component deletion
        - Add to imports: `import { useEffect } from 'react'`
        - Replace: `React.useEffect` with `useEffect`
        - Remove: `import React from 'react'` if no longer needed

#### Completion Notes

### 8: Remove Console Logs

<!-- prettier-ignore -->
- [ ] 8.1 Clean WebSocketProvider (22 statements)
        - File: `apps/web/src/client/providers/WebSocketProvider.tsx`
        - Gate debug logs: Wrap verbose logs in `if (import.meta.env.DEV) { console.log(...) }`
        - Keep error logs: Preserve console.error statements
        - Remove unnecessary logs: Delete redundant logging
- [ ] 8.2 Clean ProjectSession (14 statements)
        - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
        - Gate debug logs with `import.meta.env.DEV`
        - Keep error logs
        - Remove unnecessary logs
- [ ] 8.3 Clean useShellWebSocket (9 statements)
        - File: `apps/web/src/client/pages/projects/shell/hooks/useShellWebSocket.ts`
        - Gate debug logs with `import.meta.env.DEV`
        - Keep error logs
        - Remove unnecessary logs
- [ ] 8.4 Clean useSessionWebSocket (7 statements)
        - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
        - Gate debug logs with `import.meta.env.DEV`
        - Keep error logs
        - Remove unnecessary logs
- [ ] 8.5 Clean remaining files (18 files with 1-4 statements each)
        - Files: FileEditor.tsx, ImageViewer.tsx, ProtectedLayout.tsx, ProjectDetailLayout.tsx, syntaxHighlighter.tsx, useSlashCommands.ts, sessionStore.ts, Terminal.tsx, useShellWebSocket.ts, PromptInput.tsx, sessionAdapters.ts, CodeBlock.tsx, ContentBlockRenderer.tsx, ChatPromptInput.tsx, MessageRenderer.tsx, useWebSocket.ts, WebSocketEventBus.ts, projectSync.ts
        - For each: Gate with `import.meta.env.DEV` or remove if not needed
        - Preserve error logs (console.error)

#### Completion Notes

### 9: Remove Dead Code

<!-- prettier-ignore -->
- [ ] 9.1 Remove unused state in ProjectDetailLayout
        - File: `apps/web/src/client/layouts/ProjectDetailLayout.tsx`
        - Line: 22
        - Remove: `const [, setIsSyncing] = useState(false);`
        - If setIsSyncing was the only usage of this state, remove the entire line

#### Completion Notes

### 10: Verification and Testing

<!-- prettier-ignore -->
- [ ] 10.1 Run type check
        - Command: `pnpm check-types`
        - Expected: No TypeScript errors
        - If errors: Fix before proceeding
- [ ] 10.2 Run linter
        - Command: `pnpm lint`
        - Expected: No linting errors (or only warnings)
        - Fix any critical errors
- [ ] 10.3 Build application
        - Command: `pnpm build`
        - Expected: Successful build
        - Check bundle size reduction
- [ ] 10.4 Run unit tests
        - Command: `pnpm test` (if test script exists)
        - Expected: All tests pass
        - Fix any broken tests
- [ ] 10.5 Manual testing
        - Start dev server: `pnpm dev`
        - Test navigation: Projects → Project Detail → Sessions
        - Test WebSocket connection
        - Test file browser
        - Test shell terminal
        - Check browser console: No errors
- [ ] 10.6 Verify bundle size reduction
        - Check build output
        - Compare before/after bundle sizes
        - Expected: ~160-215KB reduction

#### Completion Notes

## Acceptance Criteria

**Must Work:**

- [ ] All existing features function identically (no regressions)
- [ ] WebSocket connections establish successfully
- [ ] Project navigation works (sidebar, header, routing)
- [ ] Chat sessions load and display messages
- [ ] File browser displays and allows editing
- [ ] Shell terminal connects and displays output
- [ ] No TypeScript errors in codebase
- [ ] No console errors in browser (except gated dev logs)
- [ ] All imports use `@/client/` aliases (no relative imports)

**Should Not:**

- [ ] Break any existing routes or navigation
- [ ] Cause TypeScript compilation errors
- [ ] Introduce runtime errors or crashes
- [ ] Degrade performance or increase bundle size
- [ ] Break WebSocket functionality
- [ ] Remove components that are actually used

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors, clean output

# Linting
pnpm lint
# Expected: No errors (warnings acceptable)

# Build verification
pnpm build
# Expected: Successful build, check bundle size in output

# Unit tests (if configured)
pnpm test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Verify: Login page loads without errors
4. Test: Complete authentication flow
5. Navigate to: Projects page
6. Verify: Projects list displays
7. Click: Any project to open detail view
8. Verify: Project header shows with navigation tabs
9. Test: Navigate between Chat, Shell, Files tabs
10. Check: Browser console shows no errors
11. Verify: WebSocket connection indicator shows "connected"
12. Test: Send a chat message
13. Verify: Message appears and assistant responds
14. Navigate to: Shell tab
15. Verify: Terminal initializes
16. Test: Type a command
17. Verify: Output displays correctly
18. Navigate to: Files tab
19. Verify: File tree loads
20. Check console: Only dev-gated logs (if any), no errors

**Feature-Specific Checks:**

- Verify no 404 errors for deleted components in Network tab
- Check bundle size: Should be ~160-215KB smaller than before
- Verify all `@/client/` imports resolve correctly
- Confirm WebSocketProvider still functions (context available)
- Test that moved ProjectHeader renders in project detail layout
- Verify routes for deleted pages return 404 or redirect appropriately

**Before/After Comparison:**

- Count files: `find apps/web/src/client -name "*.tsx" -o -name "*.ts" | wc -l`
  - Before: 182 files
  - After: ~144 files (38 fewer)
- Count console.logs: `grep -r "console\.(log|warn|debug)" apps/web/src/client | wc -l`
  - Before: 93 occurrences
  - After: Significantly reduced (only gated or error logs)
- Check relative imports: `grep -r "from ['\"]\.\./" apps/web/src/client --include="*.tsx" --include="*.ts" | grep -v node_modules | wc -l`
  - Before: 5+ violations
  - After: 0 violations

## Definition of Done

- [ ] All tasks completed (checked off)
- [ ] All dead pages deleted (5 files)
- [ ] All unused UI components deleted (~32 files)
- [ ] ProjectHeader moved to pages/projects/components/
- [ ] WebSocketContext moved to providers/
- [ ] api.ts merged into api-client.ts
- [ ] All relative imports converted to @/client/ aliases
- [ ] React.FC pattern fixed in WebSocketProvider
- [ ] React.useEffect patterns fixed (if files kept)
- [ ] Console.log statements removed or gated
- [ ] Unused state variables removed
- [ ] Type checks pass: `pnpm check-types`
- [ ] Linter passes: `pnpm lint`
- [ ] Build succeeds: `pnpm build`
- [ ] Manual testing confirms no regressions
- [ ] No console errors in browser
- [ ] Bundle size reduced by ~160-215KB
- [ ] Code follows project patterns and architecture rules

## Notes

**Exclusions per user request:**
- `components/ai-elements/` folder - Third-party generated, do not modify
- `src/shared/utils/` - Location is OK for now, leave as-is

**Dependencies:**
- No external package changes required
- All changes are refactoring/cleanup only
- No breaking changes to public APIs

**Rollback considerations:**
- Each phase can be committed separately for granular rollback
- File deletions are the only irreversible changes (keep git history)
- All other changes are pure refactoring (safe to revert)

**Future considerations:**
- Consider adding ESLint rule to prevent relative imports
- May want to add proper logging utility instead of console.log
- Could add error boundary for better error handling
- Barrel exports (index.ts) could improve import ergonomics

**Bundle size verification:**
- Check Vite build output for chunk sizes before/after
- Reducing from 182 to ~144 files (38 fewer)
- Removing 33 unused UI components should significantly reduce bundle
- Actual savings may vary based on tree-shaking effectiveness
