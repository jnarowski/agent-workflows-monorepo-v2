# Feature: Git Service Refactoring

## What We're Building

Refactoring the git service layer to decouple it from project dependencies, making it path-based and reusable for any repository. Adding essential missing git operations (pull, merge, stash, reset/discard) and updating the API routes from project-scoped to standalone path-based endpoints. This refactor enables cleaner separation of concerns and provides a complete git workflow solution.

## User Story

As a developer using the application
I want git operations to work independently of project entities
So that I can perform git actions on any repository path and have access to complete git workflows including merge, stash, and advanced operations

## Technical Approach

Convert the existing project-scoped git routes (`/api/projects/:id/git/*`) to path-based routes (`/api/git/*`) that accept repository paths directly in the request body. Refactor the git service to be purely path-based (no project dependencies), remove optional logger parameters, and add missing git operations. Update all frontend hooks and components to use the new API structure. Keep all git logic in a single well-organized service file.

## Files to Touch

### Existing Files

- `apps/web/src/server/services/git.service.ts` - Add new operations (pull, merge, stash, reset, discard), remove logger params, add section organization
- `apps/web/src/server/services/git.service.test.ts` - Update tests to remove logger mocks, add tests for new operations
- `apps/web/src/server/routes/git.ts` - Refactor from `/api/projects/:id/git/*` to `/api/git/*`, accept path in body
- `apps/web/src/server/schemas/git.ts` - Update schemas to include `path` in body, remove project params schema
- `apps/web/src/server/services/project.ts` - Remove `getCurrentBranch` import dependency
- `apps/web/src/client/pages/projects/git/hooks/useGitOperations.ts` - Update all API calls to use new path-based endpoints
- `apps/web/src/client/pages/projects/git/components/GitTopBar.tsx` - Pass projectPath instead of projectId
- `apps/web/src/client/pages/projects/git/components/ChangesView.tsx` - Update to use new hooks signature
- `apps/web/src/client/pages/projects/git/components/CommitCard.tsx` - Update to use new hooks signature
- `apps/web/src/client/pages/projects/git/components/FileChangeItem.tsx` - Update to use new hooks signature
- `apps/web/src/shared/types/git.types.ts` - Add types for new operations (stash, reset modes)

### New Files

None - all changes are refactorings of existing files

## Implementation Plan

### Phase 1: Foundation

Update TypeScript types and Zod schemas to support path-based operations. Add type definitions for new git operations (stash entries, reset modes, merge options). Refactor all schemas to accept `path` in request body instead of `projectId` in params.

### Phase 2: Core Implementation

Refactor git service to remove logger dependencies and add new operations (pull, merge, stash save/pop/list/apply, reset, discard). Organize the service file with clear section comments. Update all service functions to be purely path-based. Implement comprehensive error handling for new operations.

### Phase 3: Integration

Update API routes to use new path-based structure. Refactor frontend hooks to call new endpoints with path in body. Update all git UI components to pass projectPath instead of projectId. Update tests and ensure all existing functionality continues to work.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Type Definitions & Schemas

<!-- prettier-ignore -->
- [ ] 1.1 Add new type definitions for git operations
        - Add `GitStashEntry`, `GitResetMode`, `GitMergeOptions` types
        - File: `apps/web/src/shared/types/git.types.ts`
- [ ] 1.2 Update git schemas for path-based operations
        - Remove `gitProjectParamsSchema`
        - Add `path: z.string()` to all body schemas
        - Create new schemas: `gitPullBodySchema`, `gitMergeBodySchema`, `gitStashBodySchema`, `gitResetBodySchema`, `gitDiscardBodySchema`
        - File: `apps/web/src/server/schemas/git.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 2: Git Service Refactoring

<!-- prettier-ignore -->
- [ ] 2.1 Organize existing git.service.ts with section comments
        - Add section headers: Repository Info, Branch Operations, Staging & Commits, Remote Operations, History & Diffs, Advanced Operations, GitHub Integration
        - Remove all `logger?: FastifyBaseLogger` optional parameters from function signatures
        - Remove all `logger?.info()`, `logger?.error()`, `logger?.debug()` calls
        - File: `apps/web/src/server/services/git.service.ts`
- [ ] 2.2 Implement pull operation
        - Add `pullFromRemote(repoPath: string, remote?: string, branch?: string): Promise<void>`
        - Use `git.pull()` from simple-git
        - Handle merge conflicts gracefully
        - File: `apps/web/src/server/services/git.service.ts`
- [ ] 2.3 Implement merge operation
        - Add `mergeBranch(repoPath: string, sourceBranch: string, options?: { noFf?: boolean }): Promise<{ success: boolean; conflicts?: string[] }>`
        - Use `git.merge()` from simple-git
        - Return conflict information if merge fails
        - File: `apps/web/src/server/services/git.service.ts`
- [ ] 2.4 Implement stash operations
        - Add `stashSave(repoPath: string, message?: string): Promise<void>`
        - Add `stashPop(repoPath: string, index?: number): Promise<void>`
        - Add `stashList(repoPath: string): Promise<GitStashEntry[]>`
        - Add `stashApply(repoPath: string, index?: number): Promise<void>`
        - Use `git.stash()` from simple-git
        - File: `apps/web/src/server/services/git.service.ts`
- [ ] 2.5 Implement reset and discard operations
        - Add `resetToCommit(repoPath: string, commitHash: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void>`
        - Add `discardChanges(repoPath: string, files: string[]): Promise<void>`
        - Use `git.reset()` and `git.checkout()` from simple-git
        - File: `apps/web/src/server/services/git.service.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 3: Update Service Tests

<!-- prettier-ignore -->
- [ ] 3.1 Update existing git service tests
        - Remove all `logger` parameters from function calls
        - Update mock expectations to not include logger
        - File: `apps/web/src/server/services/git.service.test.ts`
- [ ] 3.2 Add tests for new operations
        - Add test suite for `pullFromRemote`
        - Add test suite for `mergeBranch` (success and conflict cases)
        - Add test suite for stash operations (save, pop, list, apply)
        - Add test suite for `resetToCommit` (soft, mixed, hard modes)
        - Add test suite for `discardChanges`
        - File: `apps/web/src/server/services/git.service.test.ts`
        - Run: `pnpm --filter web test git.service.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 4: Refactor API Routes

<!-- prettier-ignore -->
- [ ] 4.1 Update existing route endpoints to path-based
        - Change route paths from `/api/projects/:id/git/status` to `/api/git/status`
        - Remove `Params: z.infer<typeof gitProjectParamsSchema>` from all routes
        - Add `path: string` to body schemas
        - Remove all `getProjectById()` calls
        - Remove `userId` checks (authentication still via JWT)
        - Pass `path` from body directly to service functions (no logger param)
        - Update all existing routes: status, branches, branch (create), branch/switch, stage, unstage, commit, push, fetch, diff, history, commit/:hash, pr-data, pr, generate-commit-message
        - File: `apps/web/src/server/routes/git.ts`
- [ ] 4.2 Add new route endpoints for new operations
        - Add `POST /api/git/pull` - Pull from remote
        - Add `POST /api/git/merge` - Merge branches
        - Add `POST /api/git/stash/save` - Save stash
        - Add `POST /api/git/stash/pop` - Pop stash
        - Add `POST /api/git/stash/list` - List stashes
        - Add `POST /api/git/stash/apply` - Apply stash
        - Add `POST /api/git/reset` - Reset to commit
        - Add `POST /api/git/discard` - Discard changes
        - File: `apps/web/src/server/routes/git.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 5: Update Frontend Hooks

<!-- prettier-ignore -->
- [ ] 5.1 Refactor useGitOperations.ts query hooks
        - Update `useGitStatus`: Change from GET `/api/projects/${projectId}/git/status` to POST `/api/git/status` with `{ path }`
        - Update `useBranches`: Change to POST `/api/git/branches` with `{ path }`
        - Update `useFileDiff`: Change to POST `/api/git/diff` with `{ path, filepath }`
        - Update `useCommitHistory`: Change to POST `/api/git/history` with `{ path, limit, offset }`
        - Update `useCommitDiff`: Change to POST `/api/git/commit-diff` with `{ path, commitHash }`
        - Update `usePrData`: Change to POST `/api/git/pr-data` with `{ path, baseBranch }`
        - Update React Query cache keys to use `path` instead of `projectId`
        - File: `apps/web/src/client/pages/projects/git/hooks/useGitOperations.ts`
- [ ] 5.2 Refactor useGitOperations.ts mutation hooks
        - Update `useCreateBranch`: Change to POST `/api/git/branch` with `{ path, name, from }`
        - Update `useSwitchBranch`: Change to POST `/api/git/branch/switch` with `{ path, name }`
        - Update `useStageFiles`: Change to POST `/api/git/stage` with `{ path, files }`
        - Update `useUnstageFiles`: Change to POST `/api/git/unstage` with `{ path, files }`
        - Update `useCommit`: Change to POST `/api/git/commit` with `{ path, message, files }`
        - Update `usePush`: Change to POST `/api/git/push` with `{ path, branch, remote }`
        - Update `useFetch`: Change to POST `/api/git/fetch` with `{ path, remote }`
        - Update `useCreatePr`: Change to POST `/api/git/pr` with `{ path, title, description, baseBranch }`
        - Update `useGenerateCommitMessage`: Change to POST `/api/git/generate-commit-message` with `{ path, files }`
        - File: `apps/web/src/client/pages/projects/git/hooks/useGitOperations.ts`
- [ ] 5.3 Add new hooks for new operations
        - Add `usePull()` - Pull from remote
        - Add `useMerge()` - Merge branches
        - Add `useStashSave()` - Save stash
        - Add `useStashPop()` - Pop stash
        - Add `useStashList()` - List stashes (query hook)
        - Add `useStashApply()` - Apply stash
        - Add `useReset()` - Reset to commit
        - Add `useDiscardChanges()` - Discard changes
        - File: `apps/web/src/client/pages/projects/git/hooks/useGitOperations.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 6: Update Frontend Components

<!-- prettier-ignore -->
- [ ] 6.1 Update git components to pass projectPath
        - Update all components to accept and pass `projectPath: string` instead of `projectId: string`
        - Files to update:
          - `apps/web/src/client/pages/projects/git/components/GitTopBar.tsx`
          - `apps/web/src/client/pages/projects/git/components/ChangesView.tsx`
          - `apps/web/src/client/pages/projects/git/components/CommitCard.tsx`
          - `apps/web/src/client/pages/projects/git/components/FileChangeItem.tsx`
        - Ensure hooks are called with `path` parameter
- [ ] 6.2 Update project service to remove git dependency
        - Remove `import { getCurrentBranch } from '@/server/services/git.service'`
        - Update `getProjectById` and `getAllProjects` to not fetch git branch
        - Remove `currentBranch` from project transformation (or fetch via API call if needed)
        - File: `apps/web/src/server/services/project.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 7: Final Verification & Cleanup

<!-- prettier-ignore -->
- [ ] 7.1 Run all verification commands
        - Build: `pnpm --filter web build`
        - Type check: `pnpm --filter web check-types`
        - Lint: `pnpm --filter web lint`
        - Tests: `pnpm --filter web test`
- [ ] 7.2 Manual testing
        - Start dev server: `pnpm --filter web dev`
        - Navigate to git page for a project
        - Test all existing operations (status, branch, stage, commit, push)
        - Test new operations (pull, merge, stash, reset, discard)
        - Verify no console errors
- [ ] 7.3 Update any remaining references
        - Search codebase for old route patterns
        - Update any documentation or comments referencing old API structure

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Acceptance Criteria

**Must Work:**

- [ ] All existing git operations continue to work (status, branches, stage, unstage, commit, push, fetch, diff, history)
- [ ] New operations work correctly: pull, merge, stash (save/pop/list/apply), reset, discard
- [ ] API routes accept `path` in body instead of `projectId` in params
- [ ] Git service has no dependencies on project service or logger
- [ ] Frontend hooks use new path-based API structure
- [ ] All git UI components work with projectPath instead of projectId
- [ ] Merge conflicts are handled gracefully with informative error messages
- [ ] Stash operations preserve working directory state correctly
- [ ] Reset operations (soft/mixed/hard) work as expected
- [ ] Discard changes only affects specified files

**Should Not:**

- [ ] Break any existing git functionality
- [ ] Introduce authentication bypasses (still require JWT)
- [ ] Lose error handling or validation
- [ ] Create orphaned code or unused imports
- [ ] Degrade performance of git operations
- [ ] Allow operations on paths outside project directories (security consideration)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm --filter web build
# Expected: ✓ built in XXXms

# Type checking
pnpm --filter web check-types
# Expected: No TypeScript errors

# Linting
pnpm --filter web lint
# Expected: No ESLint errors

# Unit tests
pnpm --filter web test
# Expected: All tests pass, including new git service tests

# Run git service tests specifically
pnpm --filter web test git.service.test.ts
# Expected: All git service tests pass (existing + new operations)
```

**Manual Verification:**

1. Start application: `pnpm --filter web dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}/git`
3. Verify git status loads correctly
4. Test branch creation and switching
5. Test staging, unstaging, and committing files
6. Test new operations:
   - Pull from remote
   - Merge a branch
   - Stash changes (save, list, pop/apply)
   - Reset to a previous commit
   - Discard uncommitted changes
7. Check browser console: No errors or warnings
8. Check network tab: Verify requests go to `/api/git/*` endpoints
9. Verify authentication still works (JWT required for all operations)

**Feature-Specific Checks:**

- Create a test branch, make changes, stash them, switch branches, pop stash - verify changes restored
- Test merge with no conflicts - verify successful merge
- Test merge with conflicts - verify error message includes conflict information
- Test reset --soft vs --hard - verify working directory state differs appropriately
- Test discard changes on specific files - verify only those files are affected
- Test pull operation - verify local branch syncs with remote
- Verify all operations only work within authenticated user's project paths

## Definition of Done

- [ ] All tasks completed
- [ ] Tests passing (unit tests for all new operations)
- [ ] Lint and Type Checks pass
- [ ] Manual testing confirms all git operations work
- [ ] No console errors in browser or server logs
- [ ] Code follows existing patterns (functional services, Zod validation, proper error handling)
- [ ] Git service is purely path-based with no project dependencies
- [ ] All frontend components updated to use new API structure
- [ ] Documentation updated if needed (CLAUDE.md, server CLAUDE.md)

## Notes

**Dependencies:**
- This refactoring maintains backward compatibility with frontend by updating hooks simultaneously
- No database migrations needed (only API/service layer changes)
- Authentication remains unchanged (JWT via fastify.authenticate)

**Security Considerations:**
- Ensure path validation to prevent operations outside allowed directories
- Consider adding path sanitization/normalization
- Maintain JWT authentication for all endpoints

**Future Enhancements:**
- Add git hooks management (pre-commit, post-commit)
- Add submodule operations
- Add cherry-pick operation
- Add interactive rebase support
- Add remote management (add/remove remotes)
- Add tag operations (create, list, delete tags)
- Add git blame for file history

**Rollback Plan:**
If issues arise, the refactoring can be rolled back by:
1. Reverting route changes (restore `/api/projects/:id/git/*` structure)
2. Reverting frontend hooks to use old API
3. Keeping new git operations but accessing them via old project-scoped routes
4. Git service changes are additive, so they can remain even in rollback scenario
