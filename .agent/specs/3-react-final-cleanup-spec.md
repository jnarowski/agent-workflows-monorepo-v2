# Feature: React Frontend Code Quality Cleanup

## What We're Building

A systematic refactoring of the apps/web React frontend to eliminate code duplication, standardize patterns, and improve developer experience. This cleanup extracts common dialog patterns, form utilities, loading states, error handling, and ensures consistent query key management across all React Query hooks.

## User Story

As a developer working on the frontend
I want reusable components and utilities for common patterns
So that I can build new features faster with less boilerplate and maintain consistency across the codebase

## Technical Approach

Extract duplicated patterns into reusable hooks and components following the existing feature-based architecture. Create utility libraries for error handling and validation. Standardize React Query cache key management using factory patterns. All changes maintain backward compatibility and follow existing code conventions (TypeScript, Tailwind CSS, shadcn/ui patterns).

## Files to Touch

### Existing Files

- `apps/web/src/client/pages/projects/components/DeleteProjectDialog.tsx` - Refactor to use new BaseDialog and useDialogForm
- `apps/web/src/client/pages/projects/git/components/CreateBranchDialog.tsx` - Refactor to use new patterns
- `apps/web/src/client/pages/projects/components/ProjectDialog.tsx` - Refactor to use LoadingButton
- `apps/web/src/client/pages/projects/git/components/CreatePullRequestDialog.tsx` - Refactor to use new patterns
- `apps/web/src/client/pages/auth/components/LoginForm.tsx` - Refactor to use AuthFormCard and LoadingButton
- `apps/web/src/client/pages/auth/components/SignupForm.tsx` - Refactor to use AuthFormCard and LoadingButton
- `apps/web/src/client/pages/projects/git/hooks/useGitOperations.ts` - Add query keys factory pattern
- `apps/web/src/client/providers/WebSocketProvider.tsx` - Fix React import pattern
- `apps/web/src/client/components/ai-elements/branch.tsx` - Fix React import pattern

### New Files

- `apps/web/src/client/hooks/useDialogForm.ts` - Generic dialog form state management hook
- `apps/web/src/client/components/BaseDialog.tsx` - Reusable dialog wrapper with reset functionality
- `apps/web/src/client/components/ui/loading-button.tsx` - Button with integrated loading state
- `apps/web/src/client/components/ui/error-alert.tsx` - Reusable error alert component
- `apps/web/src/client/lib/error-handlers.ts` - Error handling utilities for mutations
- `apps/web/src/client/pages/auth/components/AuthFormCard.tsx` - Shared auth form card wrapper
- `apps/web/src/client/hooks/useDialogForm.test.ts` - Tests for useDialogForm hook
- `apps/web/src/client/components/ui/loading-button.test.tsx` - Tests for LoadingButton component
- `apps/web/src/client/lib/error-handlers.test.ts` - Tests for error utilities

## Implementation Plan

### Phase 1: Foundation (Utilities and Hooks)

Create core utilities and hooks that other components will depend on:
- useDialogForm hook for form state management
- Error handling utilities
- Import pattern fixes

### Phase 2: Core Components

Build reusable UI components using the foundation:
- BaseDialog wrapper component
- LoadingButton component
- ErrorAlert component
- AuthFormCard component

### Phase 3: Integration and Refactoring

Apply new patterns to existing components:
- Refactor 4 dialog components
- Refactor 2 auth form components
- Standardize git operations query keys
- Add comprehensive tests

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Fix Import Patterns

<!-- prettier-ignore -->
- [ ] 1.1 Fix WebSocketProvider React imports
        - Change `import React, { ... }` to `import { ... }`
        - File: `apps/web/src/client/providers/WebSocketProvider.tsx`
        - Only import hooks directly, not React namespace
- [ ] 1.2 Fix branch component React imports
        - Change `import React, { ... }` to `import { ... }`
        - File: `apps/web/src/client/components/ai-elements/branch.tsx`
        - Verify component still renders correctly

#### Completion Notes

### 2: Create Core Utilities

<!-- prettier-ignore -->
- [ ] 2.1 Create error handler utilities
        - File: `apps/web/src/client/lib/error-handlers.ts`
        - Export `extractErrorMessage(error: unknown, fallback?: string): string`
        - Export `handleMutationError(error: unknown, fallbackMessage: string): void` with toast integration
- [ ] 2.2 Create error handler tests
        - File: `apps/web/src/client/lib/error-handlers.test.ts`
        - Test Error instances, string errors, unknown errors
        - Test toast integration with mock
- [ ] 2.3 Create useDialogForm hook
        - File: `apps/web/src/client/hooks/useDialogForm.ts`
        - Generic type parameter for form values
        - Return: values, setValues, error, setError, isSubmitting, handleSubmit, reset
        - Handle async onSubmit with try/catch
- [ ] 2.4 Create useDialogForm tests
        - File: `apps/web/src/client/hooks/useDialogForm.test.ts`
        - Test form submission success/error
        - Test reset functionality
        - Use @testing-library/react-hooks

#### Completion Notes

### 3: Create UI Components

<!-- prettier-ignore -->
- [ ] 3.1 Create ErrorAlert component
        - File: `apps/web/src/client/components/ui/error-alert.tsx`
        - Props: error (string | null | undefined), className (optional)
        - Return null if no error
        - Use Alert with destructive variant, AlertCircle icon
- [ ] 3.2 Create LoadingButton component
        - File: `apps/web/src/client/components/ui/loading-button.tsx`
        - Extend ButtonProps with isLoading and loadingText
        - Show Loader2 spinner when loading
        - Disable button when loading or disabled prop
        - Use kebab-case filename per shadcn/ui convention
- [ ] 3.3 Create LoadingButton tests
        - File: `apps/web/src/client/components/ui/loading-button.test.tsx`
        - Test loading state renders spinner
        - Test loadingText display
        - Test disabled state
- [ ] 3.4 Create BaseDialog component
        - File: `apps/web/src/client/components/BaseDialog.tsx`
        - Props: open, onOpenChange, onClose (optional callback), children
        - Call onClose when dialog closes (newOpen = false)
        - Wrap Dialog and DialogContent from shadcn/ui
        - Use PascalCase filename
- [ ] 3.5 Create AuthFormCard component
        - File: `apps/web/src/client/pages/auth/components/AuthFormCard.tsx`
        - Props: title, description, error, onSubmit, children
        - Render Card with CardHeader, CardTitle, CardDescription
        - Show error alert if error exists
        - Wrap children in form with FieldGroup

#### Completion Notes

### 4: Refactor Dialog Components

<!-- prettier-ignore -->
- [ ] 4.1 Refactor DeleteProjectDialog
        - File: `apps/web/src/client/pages/projects/components/DeleteProjectDialog.tsx`
        - Replace AlertDialog open/onOpenChange pattern with BaseDialog (if applicable)
        - Use LoadingButton for action button
        - Use ErrorAlert for error display (if adding error state)
        - Keep AlertDialog structure (deletion confirmation pattern)
- [ ] 4.2 Refactor CreateBranchDialog
        - File: `apps/web/src/client/pages/projects/git/components/CreateBranchDialog.tsx`
        - Use useDialogForm for form state (branchName, error, isSubmitting)
        - Use BaseDialog wrapper
        - Use LoadingButton for create button
        - Use ErrorAlert for error display
        - Keep validation logic
- [ ] 4.3 Refactor ProjectDialog
        - File: `apps/web/src/client/pages/projects/components/ProjectDialog.tsx`
        - Keep react-hook-form (complex validation requirements)
        - Use LoadingButton for submit button
        - Use ErrorAlert if adding mutation error display
        - Consider useDialogForm for simpler error handling layer
- [ ] 4.4 Refactor CreatePullRequestDialog
        - File: `apps/web/src/client/pages/projects/git/components/CreatePullRequestDialog.tsx`
        - Use useDialogForm for title, description, baseBranch state
        - Use BaseDialog wrapper
        - Use LoadingButton for create button
        - Use ErrorAlert for mutation error display
        - Keep usePrData query hook

#### Completion Notes

### 5: Refactor Auth Forms

<!-- prettier-ignore -->
- [ ] 5.1 Refactor LoginForm
        - File: `apps/web/src/client/pages/auth/components/LoginForm.tsx`
        - Wrap form content with AuthFormCard
        - Pass title, description, error, onSubmit props
        - Move Card/CardHeader/CardContent structure to AuthFormCard
        - Use LoadingButton for submit button
        - Keep Field components as children
- [ ] 5.2 Refactor SignupForm
        - File: `apps/web/src/client/pages/auth/components/SignupForm.tsx`
        - Wrap form content with AuthFormCard
        - Pass title, description, error, onSubmit props
        - Use LoadingButton for submit button
        - Keep confirm password field logic

#### Completion Notes

### 6: Standardize Git Query Keys

<!-- prettier-ignore -->
- [ ] 6.1 Create gitKeys factory
        - File: `apps/web/src/client/pages/projects/git/hooks/useGitOperations.ts`
        - Add at top of file (before query hooks):
          ```typescript
          export const gitKeys = {
            all: ['git'] as const,
            status: (projectId: string) => [...gitKeys.all, 'status', projectId] as const,
            branches: (projectId: string) => [...gitKeys.all, 'branches', projectId] as const,
            diff: (projectId: string, filepath: string | null) =>
              [...gitKeys.all, 'diff', projectId, filepath] as const,
            history: (projectId: string, limit: number, offset: number) =>
              [...gitKeys.all, 'history', projectId, limit, offset] as const,
            commit: (projectId: string, hash: string | null) =>
              [...gitKeys.all, 'commit', projectId, hash] as const,
            prData: (projectId: string, baseBranch: string) =>
              [...gitKeys.all, 'pr-data', projectId, baseBranch] as const,
          };
          ```
- [ ] 6.2 Update useGitStatus query key
        - Replace `queryKey: ['git', 'status', projectId]` with `queryKey: gitKeys.status(projectId!)`
- [ ] 6.3 Update useBranches query key
        - Replace `queryKey: ['git', 'branches', projectId]` with `queryKey: gitKeys.branches(projectId!)`
- [ ] 6.4 Update useFileDiff query key
        - Replace inline key with `queryKey: gitKeys.diff(projectId!, filepath)`
- [ ] 6.5 Update useCommitHistory query key
        - Replace inline key with `queryKey: gitKeys.history(projectId!, limit, offset)`
- [ ] 6.6 Update useCommitDiff query key
        - Replace inline key with `queryKey: gitKeys.commit(projectId!, commitHash)`
- [ ] 6.7 Update usePrData query key
        - Replace inline key with `queryKey: gitKeys.prData(projectId!, baseBranch)`
- [ ] 6.8 Update all mutation invalidateQueries calls
        - Update useCreateBranch to use `gitKeys.branches(variables.projectId)`
        - Update useCreateBranch to use `gitKeys.status(variables.projectId)`
        - Update useSwitchBranch invalidations (2 calls)
        - Update useStageFiles invalidation
        - Update useUnstageFiles invalidation
        - Update useCommit invalidations (2 calls)
        - Update usePush invalidation
        - Update useFetch invalidations (2 calls)

#### Completion Notes

### 7: Add Tests and Verification

<!-- prettier-ignore -->
- [ ] 7.1 Run all existing tests
        - Command: `cd apps/web && pnpm test`
        - Expected: All tests pass with no regressions
- [ ] 7.2 Run type checking
        - Command: `cd apps/web && pnpm check-types`
        - Expected: No type errors
- [ ] 7.3 Run linting
        - Command: `cd apps/web && pnpm lint`
        - Expected: No lint errors
- [ ] 7.4 Manual testing - Dialogs
        - Start dev server: `cd apps/web && pnpm dev`
        - Test DeleteProjectDialog (open/close/delete/error)
        - Test CreateBranchDialog (open/close/create/validation/error)
        - Test ProjectDialog (open/close/create/edit)
        - Test CreatePullRequestDialog (open/close/create/error)
- [ ] 7.5 Manual testing - Auth forms
        - Test LoginForm (submit/error/loading)
        - Test SignupForm (submit/error/loading/validation)
- [ ] 7.6 Manual testing - Git operations
        - Test git status query
        - Test branch switching
        - Test creating branch
        - Verify cache invalidation works
- [ ] 7.7 Check bundle size impact
        - Command: `cd apps/web && pnpm build`
        - Verify no significant bundle size increase
        - Check for proper tree-shaking of new utilities

#### Completion Notes

## Acceptance Criteria

**Must Work:**

- [ ] All 4 dialog components open, close, submit, and reset correctly
- [ ] Form validation works in all dialogs (CreateBranch, PR)
- [ ] Error states display correctly with ErrorAlert
- [ ] Loading states show spinner and disable interaction
- [ ] Auth forms submit successfully with proper error handling
- [ ] Git operations cache invalidation works correctly
- [ ] All existing tests pass with no regressions
- [ ] No console errors or warnings during usage
- [ ] TypeScript compiles with no errors
- [ ] Direct hook imports work (no React.useEffect)

**Should Not:**

- [ ] Break any existing dialog or form functionality
- [ ] Introduce type errors or lint violations
- [ ] Cause infinite re-renders or React warnings
- [ ] Increase bundle size significantly (>5%)
- [ ] Remove any existing functionality
- [ ] Break React Query cache behavior

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web && pnpm check-types
# Expected: No type errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors

# Unit tests
cd apps/web && pnpm test
# Expected: All tests pass, including new tests for:
#   - useDialogForm hook
#   - LoadingButton component
#   - error-handlers utilities

# Build verification
cd apps/web && pnpm build
# Expected: Successful build with no errors
# Check dist/client/assets for bundle size
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173/projects`
3. Test Dialogs:
   - Click "New Project" → Verify ProjectDialog opens with LoadingButton
   - Create a project → Verify success and dialog closes
   - Try to delete a project → Verify DeleteProjectDialog works
   - Navigate to Git tab → Create new branch → Verify CreateBranchDialog
   - Verify CreatePullRequestDialog with base branch selection
4. Test Auth Forms:
   - Logout and navigate to `/login`
   - Verify LoginForm displays correctly with AuthFormCard wrapper
   - Test form submission and error states
   - Navigate to `/signup` and verify SignupForm
5. Test Error Handling:
   - Trigger validation errors in CreateBranchDialog
   - Verify ErrorAlert displays correctly
   - Check mutation errors show toasts
6. Check Console: No errors, warnings, or React strict mode violations

**Feature-Specific Checks:**

- Open DevTools → React Components → Verify BaseDialog wraps dialog content
- Check Network tab → Git mutations should invalidate correct query keys
- Verify LoadingButton shows spinner during async operations
- Confirm form reset works when closing dialogs without submitting
- Test dialog state cleanup (open → submit error → close → reopen → state is reset)
- Verify direct hook imports work (search for `React.useEffect` - should find 0)

## Definition of Done

- [ ] All tasks completed in order
- [ ] All new tests written and passing
- [ ] All existing tests still passing
- [ ] Lint and type checks pass
- [ ] Manual testing confirms all dialogs and forms work
- [ ] No console errors during typical usage
- [ ] Code follows existing patterns (feature-based organization, @/ imports)
- [ ] Bundle size impact is minimal (<5% increase)
- [ ] Documentation updated if needed (CLAUDE.md accurate)
- [ ] Git query keys use factory pattern consistently
- [ ] All React imports use direct hook imports (no React.useEffect)

## Notes

**Dependencies:**
- This refactoring is self-contained and doesn't depend on other features
- All changes are backward compatible
- Can be implemented incrementally (utilities → components → refactoring)

**Future Considerations:**
- Could extract similar patterns from other feature areas (files, sessions)
- LoadingButton could be enhanced with progress indicators
- Consider creating similar form utilities for react-hook-form patterns
- ErrorAlert could support different severity levels (warning, info)

**Rollback Strategy:**
- Changes are isolated to specific files
- Can revert individual file changes if issues arise
- No database migrations or API changes involved
- Can safely roll back by reverting commits

**Important Context:**
- ProjectDialog uses react-hook-form + zod (keep this pattern, just use LoadingButton)
- DeleteProjectDialog uses AlertDialog (different pattern, may not need BaseDialog)
- Git operations already have good query key patterns in other hooks (useProjects, useFiles, useSlashCommands)
- Auth forms are simple callback-based (good candidate for AuthFormCard extraction)
- All components use Tailwind CSS + shadcn/ui components
