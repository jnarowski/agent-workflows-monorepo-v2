# Feature: Terminal Layout Fix and Component Simplification

## What We're Building

Fix the terminal positioning issue where the terminal renders way down the page instead of at the top of the viewport. Simultaneously simplify the Terminal component by removing over-engineered terminal instance caching and following react-xtermjs patterns for better maintainability and debuggability.

## User Story

As a developer using the shell interface
I want the terminal to render at the top of the available viewport area
So that I can immediately see and interact with the shell without scrolling

## Technical Approach

The issue stems from a broken flexbox chain in the ProtectedLayout component. The SidebarInset from shadcn already provides proper flex layout (`flex w-full flex-1 flex-col`), but an unnecessary wrapper div in ProtectedLayout.tsx breaks this chain. We'll remove the redundant wrapper and simplify the Terminal component to follow react-xtermjs patterns: direct ref attachment, single focused useEffect, and no terminal instance caching. This maintains shadcn's built-in viewport height management (`min-h-svh`) without adding global CSS overrides.

## Files to Touch

### Existing Files

- `apps/web/src/client/layouts/ProtectedLayout.tsx` - Remove unnecessary flex wrapper div that breaks shadcn's layout chain
- `apps/web/src/client/components/terminal/Terminal.tsx` - Simplify component following react-xtermjs patterns, remove instance caching
- `apps/web/src/client/contexts/ShellContext.tsx` - Remove terminal instance storage from context (lines 17-25)

### New Files

None - this is a refactoring/fix of existing code

## Implementation Plan

### Phase 1: Foundation

Fix the root cause layout issue in ProtectedLayout.tsx by removing the redundant flex wrapper that breaks shadcn's sidebar layout chain. This immediately resolves the positioning problem.

### Phase 2: Core Implementation

Simplify Terminal.tsx by removing terminal instance persistence logic, consolidating multiple useEffects into a single focused creation effect, eliminating setTimeout hacks, and implementing direct ref pattern like react-xtermjs.

### Phase 3: Integration

Update ShellContext to remove terminal instance storage (keep only WebSocket session state), verify WebSocket integration still works correctly, and ensure terminal state management is clean and maintainable.

## Step by Step Tasks

### 1: Fix Layout Chain in ProtectedLayout

<!-- prettier-ignore -->
- [ ] 1.1 Remove unnecessary wrapper div in ProtectedLayout.tsx
        - The SidebarInset already provides `flex-1 flex-col` layout
        - Remove the redundant `<div className="flex flex-1 flex-col">` wrapper (lines 36-38)
        - Change from: `<SidebarInset><div className="flex flex-1 flex-col"><Outlet /></div></SidebarInset>`
        - Change to: `<SidebarInset><Outlet /></SidebarInset>`
        - File: `apps/web/src/client/layouts/ProtectedLayout.tsx`
- [ ] 1.2 Verify shadcn sidebar layout still works
        - Test with sidebar expanded and collapsed
        - Check responsive behavior on mobile
        - Ensure SidebarProvider's `min-h-svh` is flowing correctly

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 2: Update ShellContext Types

<!-- prettier-ignore -->
- [ ] 2.1 Remove terminal instance fields from TerminalSession interface
        - Remove `terminal: Terminal | null` (line 19)
        - Remove `fitAddon: FitAddon | null` (line 20)
        - Remove `containerElement: HTMLDivElement | null` (line 21)
        - Keep: id, projectId, status, sessionId, error
        - File: `apps/web/src/client/contexts/ShellContext.tsx`
- [ ] 2.2 Update removeSession to not dispose terminal
        - Remove terminal disposal logic (lines 58-60)
        - Terminal disposal will be handled in Terminal.tsx cleanup
        - File: `apps/web/src/client/contexts/ShellContext.tsx`
- [ ] 2.3 Remove terminal-related imports
        - Remove `import type { Terminal } from '@xterm/xterm'` (line 8)
        - Remove `import type { FitAddon } from '@xterm/addon-fit'` (line 9)
        - File: `apps/web/src/client/contexts/ShellContext.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 3: Simplify Terminal Component - Remove Persistence Logic

<!-- prettier-ignore -->
- [ ] 3.1 Remove terminal instance reuse logic
        - Delete lines 55-67 (existingSession checks and terminal reuse)
        - Terminal will be created fresh on each mount
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`
- [ ] 3.2 Remove terminal state saving on unmount
        - Delete lines 191-197 (updateSession with terminal/fitAddon)
        - Terminal cleanup will simply dispose, not save state
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`
- [ ] 3.3 Update addSession call to not include terminal instances
        - Remove `terminal` and `fitAddon` from addSession call (lines 133-139)
        - Only pass: projectId, status, containerElement: null
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`
- [ ] 3.4 Remove unused refs and state
        - Remove `resizeObserverRef` (line 27) - declared but never used
        - Remove `lastDimensionsRef` if not needed for resize
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 4: Simplify Terminal Component - Consolidate Effects

<!-- prettier-ignore -->
- [ ] 4.1 Consolidate terminal initialization into single useEffect
        - Merge terminal creation, addon loading, and event handlers into one effect
        - Remove complex dependency arrays that cause re-runs
        - Pattern: create terminal → load addons → attach handlers → fit → return cleanup
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`
- [ ] 4.2 Remove setTimeout hacks
        - Remove setTimeout for initialFit (line 184)
        - Remove setTimeout for connect (line 215)
        - Fix root cause: ensure parent has dimensions before fitting
        - Use ResizeObserver or rely on FitAddon's proposeDimensions
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`
- [ ] 4.3 Implement proper ResizeObserver
        - Either implement ResizeObserver properly to handle parent resize
        - Or remove it entirely if not needed
        - react-xtermjs doesn't use ResizeObserver - just fits on mount
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`
- [ ] 4.4 Simplify connection effect
        - Keep connection logic but remove timing hacks
        - Ensure terminal is ready before connecting
        - Use callback refs if needed to ensure DOM is mounted
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 5: Clean Up Terminal Component Structure

<!-- prettier-ignore -->
- [ ] 5.1 Organize component into clear sections
        - Section 1: Refs and state
        - Section 2: WebSocket hooks
        - Section 3: Single terminal initialization effect
        - Section 4: Connection effect
        - Section 5: Render
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`
- [ ] 5.2 Add clear comments for each section
        - Document why terminal is created fresh each time
        - Document WebSocket integration approach
        - Document fit/resize strategy
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`
- [ ] 5.3 Ensure cleanup is comprehensive
        - Dispose terminal in cleanup
        - Disconnect WebSocket in cleanup
        - Clear all timeouts/observers
        - File: `apps/web/src/client/components/terminal/Terminal.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 6: Update ShellContext Implementation

<!-- prettier-ignore -->
- [ ] 6.1 Verify TerminalSession interface is correct
        - Should only contain: id, projectId, status, sessionId?, error?
        - No terminal instances or DOM refs
        - File: `apps/web/src/client/contexts/ShellContext.tsx`
- [ ] 6.2 Update addSession calls throughout codebase
        - Search for all addSession calls
        - Ensure none are passing terminal/fitAddon
        - Command: `grep -r "addSession" apps/web/src/client/`
- [ ] 6.3 Update getSession usage throughout codebase
        - Search for all getSession calls
        - Ensure none are accessing terminal/fitAddon properties
        - Command: `grep -r "getSession" apps/web/src/client/`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Acceptance Criteria

**Must Work:**

- [ ] Terminal renders at the top of the viewport, not way down the page
- [ ] Terminal fills available height between ShellControls and bottom of viewport
- [ ] WebSocket connection works correctly (input/output/resize)
- [ ] Terminal displays shell output correctly with proper formatting
- [ ] Keyboard shortcuts work (Cmd/Ctrl+C for copy when text selected, Cmd/Ctrl+V for paste)
- [ ] Terminal reconnects properly on WebSocket disconnect (up to 5 attempts)
- [ ] Terminal fits properly on window resize
- [ ] Terminal state is clean on mount/unmount (no memory leaks)
- [ ] Multiple shells can be opened in different projects without interference

**Should Not:**

- [ ] Break existing sidebar layout or navigation
- [ ] Break mobile responsive behavior
- [ ] Cause console errors or warnings
- [ ] Re-render unnecessarily causing terminal flicker
- [ ] Leave zombie terminal instances or WebSocket connections
- [ ] Require global CSS overrides that conflict with shadcn patterns
- [ ] Break when switching between Chat/Shell/Files tabs

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors in Terminal.tsx, ProtectedLayout.tsx, ShellContext.tsx

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{project-id}/shell`
3. Verify: Terminal appears immediately at top of viewport (not scrolled down)
4. Verify: Terminal fills available height correctly
5. Test: Type commands in terminal, verify output appears correctly
6. Test: Resize browser window, verify terminal resizes properly
7. Test: Switch to Chat tab and back to Shell tab, verify terminal reconnects
8. Test: Toggle sidebar collapsed/expanded, verify terminal adjusts
9. Test: Open DevTools Console, verify no errors or warnings
10. Test: Navigate between different projects' shells
11. Check console: No errors, warnings, or memory leak messages

**Feature-Specific Checks:**

- Inspect element on terminal container, verify it has proper height from parent
- Check flex chain: ProtectedLayout → SidebarInset → Outlet → ProjectDetailLayout → ProjectShell → Terminal
- Verify SidebarInset has `flex-1` and ProjectDetailLayout has `h-full`
- Open React DevTools, verify no excessive re-renders on Terminal component
- Check Network tab, verify WebSocket connection is established correctly
- Verify terminal scrollback works (type long output, scroll up/down)
- Test edge case: Kill WebSocket from server side, verify reconnection attempts
- Test edge case: Navigate away during connection, verify cleanup happens

## Definition of Done

- [ ] All tasks completed
- [ ] Terminal positioning issue resolved
- [ ] Terminal component simplified (no instance caching)
- [ ] ShellContext cleaned up (no terminal storage)
- [ ] Type checks passing
- [ ] Lint checks passing
- [ ] Build succeeds
- [ ] Manual testing confirms terminal works correctly
- [ ] No console errors or warnings
- [ ] Code follows react-xtermjs patterns
- [ ] WebSocket integration still works
- [ ] No memory leaks or zombie connections
- [ ] Responsive behavior maintained

## Notes

**Key Design Decisions:**

1. **No global CSS overrides**: We respect shadcn's built-in `min-h-svh` pattern rather than adding `height: 100vh` to html/body/#root
2. **No terminal instance caching**: Terminal is created fresh on each mount, disposed on unmount. This simplifies state management and prevents stale state bugs.
3. **Single responsibility**: ShellContext manages WebSocket session state only. Terminal component manages xterm.js instance lifecycle.
4. **React patterns**: Follow react-xtermjs approach - simple ref attachment, focused effects, clear cleanup

**Dependencies:**

- No new dependencies required
- Existing dependencies: @xterm/xterm, @xterm/addon-fit, @xterm/addon-clipboard

**Future Considerations:**

- Consider adding ResizeObserver for more robust terminal resizing
- Consider adding terminal session persistence (save/restore terminal history)
- Consider adding terminal customization UI (font size, theme, etc.)
- Monitor performance with many terminal sessions open

**Rollback Plan:**

If issues arise, revert changes in reverse order:
1. Revert ShellContext changes
2. Revert Terminal.tsx simplification
3. Revert ProtectedLayout.tsx layout fix

Each file can be reverted independently using git.
