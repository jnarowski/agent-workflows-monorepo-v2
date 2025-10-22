# Feature: Project Sync from Claude CLI

## What We're Building

An automated project sync system that imports projects from the user's `~/.claude/projects/` directory into the application database on demand. When users authenticate, the system will discover Claude CLI projects, create database records for them, and sync the most recent 5 sessions for each project, making all existing Claude CLI work immediately accessible in the UI.

## User Story

As a user with existing Claude CLI projects
I want my projects to automatically appear in the application after login
So that I can access my Claude CLI session history without manual project creation

## Technical Approach

We'll implement a sync service that scans the `~/.claude/projects/` filesystem directory, extracts actual project paths from JSONL session files (using the claudecodeui extraction approach), creates or updates project records in the database, and leverages the existing `syncProjectSessions` service to import the most recent 5 sessions per project. The sync will be triggered from the `ProtectedLayout` component after authentication, running in the background via a React Query mutation that invalidates the projects cache on completion, causing automatic UI updates across all components using `useProjects()`.

## Files to Touch

### Existing Files

- `apps/web/src/server/routes/projects.ts` - Add POST /api/projects/sync endpoint
- `apps/web/src/server/services/project.service.ts` - Add upsert methods for project creation/update by path
- `apps/web/src/client/hooks/useProjects.ts` - Add useSyncProjects() mutation hook and syncProjects() API function
- `apps/web/src/client/layouts/ProtectedLayout.tsx` - Add useEffect to trigger sync on mount

### New Files

- `apps/web/src/server/services/project-sync.service.ts` - Core sync logic: scan filesystem, extract paths, orchestrate imports
- `apps/web/src/shared/types/project-sync.types.ts` - TypeScript types for sync responses and statistics

## Implementation Plan

### Phase 1: Foundation

Create the type definitions and base service structure. Define the sync response types and statistics format. Set up the project sync service class with filesystem scanning utilities adapted from claudecodeui's `extractProjectDirectory` and `getProjects` functions.

### Phase 2: Core Implementation

Implement the backend sync endpoint and service logic. Add the POST /api/projects/sync route with JWT authentication. Implement the core sync algorithm: scan ~/.claude/projects/, extract real project paths from JSONL files, create/update database records, and call syncProjectSessions for each project. Add helper methods to ProjectService for upsert operations.

### Phase 3: Integration

Connect the frontend to the sync endpoint. Create the useSyncProjects() React Query mutation hook that calls the API and invalidates the projects cache. Integrate the sync call into ProtectedLayout with a useEffect that triggers once on mount, ensuring all authenticated users get their projects synced automatically.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Type Definitions

<!-- prettier-ignore -->
- [x] 1.1 Create sync response types
        - Define SyncProjectsResponse interface with projectsImported, projectsUpdated, totalSessionsSynced counts
        - File: `apps/web/src/shared/types/project-sync.types.ts`

### 2: Backend - Project Service Enhancement

<!-- prettier-ignore -->
- [x] 2.1 Add getProjectByPath method
        - Query project by path field (case-sensitive match)
        - Return Project | null
        - File: `apps/web/src/server/services/project.service.ts`
- [x] 2.2 Add createOrUpdateProject method
        - Accept name, path parameters
        - Check if project exists by path using getProjectByPath
        - If exists: update name and updated_at, return existing project
        - If not: create new project with provided name and path
        - Return created/updated Project
        - File: `apps/web/src/server/services/project.service.ts`

#### Completion Notes

- Added `getProjectByPath` method that queries project by path field with case-sensitive matching
- Added `createOrUpdateProject` method that handles upsert logic by path
- Update logic modifies name and updated_at timestamp for existing projects
- New projects are created with provided name and path when no match is found

### 3: Backend - Project Sync Service

<!-- prettier-ignore -->
- [x] 3.1 Create ProjectSyncService class skeleton
        - Import fs/promises, path, os, readline
        - Add private method getClaudeProjectsDir() that returns path.join(os.homedir(), '.claude', 'projects')
        - File: `apps/web/src/server/services/project-sync.service.ts`
- [x] 3.2 Implement extractProjectDirectory method
        - Port logic from claudecodeui/server/projects.js extractProjectDirectory function (lines 264-372)
        - Read JSONL files from project folder, extract cwd field from entries
        - Use cwd frequency analysis to determine actual project path
        - Fall back to decoded directory name (replace - with /) if no JSONL files
        - Return extracted project path string
        - File: `apps/web/src/server/services/project-sync.service.ts`
- [x] 3.3 Implement decodeProjectPath helper
        - Convert filesystem-encoded path back to real path
        - Replace - with / (e.g., "Users-john-myproject" → "Users/john/myproject")
        - Add leading / if not present
        - File: `apps/web/src/server/services/project-sync.service.ts`
- [x] 3.4 Implement syncFromClaudeProjects method
        - Accept userId parameter
        - Initialize counters: projectsImported = 0, projectsUpdated = 0, totalSessionsSynced = 0
        - Get Claude projects directory path
        - Check if directory exists using fs.access, return empty stats if not
        - Read directory entries using fs.readdir with withFileTypes
        - Filter for directories only
        - For each project directory:
          - Extract actual project path using extractProjectDirectory
          - Generate display name from last path segment
          - Call projectService.createOrUpdateProject(displayName, actualPath)
          - Track if project was created (new) or updated (existing) by checking if project.created_at === project.updated_at
          - Call agentSessionService.syncProjectSessions(project.id, userId)
          - Accumulate session sync results to totalSessionsSynced
          - Increment projectsImported or projectsUpdated counters
        - Return SyncProjectsResponse with final counts
        - File: `apps/web/src/server/services/project-sync.service.ts`
- [x] 3.5 Export singleton instance
        - Export const projectSyncService = new ProjectSyncService()
        - File: `apps/web/src/server/services/project-sync.service.ts`

#### Completion Notes

- Created ProjectSyncService class with all required methods
- Ported extractProjectDirectory logic from claudecodeui to TypeScript
- Implemented cwd frequency analysis with fallback to most recent cwd if usage is reasonable (>25% of max)
- Added decodeProjectPath helper that converts encoded paths (Users-john-myproject → /Users/john/myproject)
- Implemented syncFromClaudeProjects with proper error handling for missing directories
- Service tracks new vs updated projects by comparing created_at and updated_at timestamps
- Singleton instance exported for use in routes

### 4: Backend - API Endpoint

<!-- prettier-ignore -->
- [x] 4.1 Add sync endpoint to project routes
        - Add POST /api/projects/sync route with preHandler: fastify.authenticate
        - Extract userId from request.user?.id (JWT token)
        - Return 401 if userId is undefined
        - Call projectSyncService.syncFromClaudeProjects(userId)
        - Return response: { data: syncResults }
        - Wrap in try/catch, return 500 on error with error message
        - File: `apps/web/src/server/routes/projects.ts`

#### Completion Notes

- Added POST /api/projects/sync endpoint with JWT authentication
- Route extracts userId from request.user and returns 401 if missing
- Calls projectSyncService.syncFromClaudeProjects and returns sync results
- Includes proper error handling with 500 status on failures
- Response schema defined for OpenAPI documentation

### 5: Frontend - API Hook

<!-- prettier-ignore -->
- [x] 5.1 Add syncProjects API function
        - Create async function that calls POST /api/projects/sync
        - Use fetchWithAuth helper (already defined in file)
        - Accept onUnauthorized callback parameter
        - Return SyncProjectsResponse data
        - File: `apps/web/src/client/hooks/useProjects.ts`
- [x] 5.2 Add useSyncProjects mutation hook
        - Create hook using useMutation from @tanstack/react-query
        - Get queryClient and handleInvalidToken from useAuth
        - Set mutationFn to call syncProjects(handleInvalidToken)
        - onSuccess: invalidate projectKeys.lists() to trigger refetch
        - onSuccess: show toast.success with "Projects synced: X imported, Y updated"
        - onError: show toast.error with error message
        - Return UseMutationResult<SyncProjectsResponse, Error, void>
        - File: `apps/web/src/client/hooks/useProjects.ts`
- [x] 5.3 Export useSyncProjects from hooks
        - Add to exports alongside useProjects, useCreateProject, etc.
        - File: `apps/web/src/client/hooks/useProjects.ts`

#### Completion Notes

- Added syncProjects API function that POSTs to /api/projects/sync endpoint
- Implemented useSyncProjects mutation hook with proper error handling
- Hook invalidates project list cache on success to trigger UI updates
- Success toast displays sync statistics (imported/updated counts)
- Function is exported and ready to use in components

### 6: Frontend - Integration

<!-- prettier-ignore -->
- [x] 6.1 Add sync to ProtectedLayout
        - Import useSyncProjects from hooks
        - Call const syncProjects = useSyncProjects() at component level
        - Add useEffect with empty dependency array (run once on mount)
        - Inside useEffect: call syncProjects.mutate()
        - No loading indicator needed (runs silently in background)
        - File: `apps/web/src/client/layouts/ProtectedLayout.tsx`

#### Completion Notes

- Integrated useSyncProjects hook into ProtectedLayout component
- Added useEffect that triggers sync once on component mount
- Sync runs silently in background without blocking UI rendering
- Toast notifications will inform users of sync results

## Acceptance Criteria

**Must Work:**

- [ ] Sync endpoint returns 401 if not authenticated
- [ ] Sync correctly extracts project paths from JSONL files with cwd field
- [ ] Projects with multiple JSONL files use most recent cwd when frequencies differ
- [ ] New projects are created in database with correct name and path
- [ ] Existing projects (by path match) are updated, not duplicated
- [ ] Exactly 5 most recent sessions are synced per project (per syncProjectSessions logic)
- [ ] Frontend invalidates projects cache after sync, causing sidebar and Projects page to refetch
- [ ] Sync runs automatically once per login session (ProtectedLayout mount)
- [ ] Sync response includes accurate counts: projectsImported, projectsUpdated, totalSessionsSynced
- [ ] Toast notifications show success/error states

**Should Not:**

- [ ] Create duplicate projects for the same filesystem path
- [ ] Block UI rendering (sync runs asynchronously in background)
- [ ] Crash server if ~/.claude/projects/ directory doesn't exist
- [ ] Fail if a project directory has no JSONL files
- [ ] Show multiple toasts if ProtectedLayout remounts (mutation dedupe)
- [ ] Sync projects for unauthenticated users
- [ ] Modify or delete any JSONL files in ~/.claude/projects/

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: ✓ built in XXXms

# Type checking
pnpm check-types
# Expected: No TypeScript errors

# Linting
pnpm lint
# Expected: No linting errors

# Unit tests (if added)
pnpm test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Ensure you have existing projects in `~/.claude/projects/` directory
3. Login to the application
4. Open browser DevTools → Network tab
5. Verify: POST /api/projects/sync request is made automatically
6. Verify: Response includes `{ data: { projectsImported: X, projectsUpdated: Y, totalSessionsSynced: Z } }`
7. Navigate to Projects page (`/projects`)
8. Verify: Claude CLI projects appear in the table
9. Open sidebar (AppInnerSidebar)
10. Verify: Same projects appear in sidebar project list
11. Click on a synced project
12. Verify: Most recent 5 sessions are visible in sidebar under project
13. Test edge cases:
    - Login with no ~/.claude/projects/ directory → no error, empty response
    - Login with projects that have no sessions → projects created, 0 sessions synced
    - Add a new project folder to ~/.claude/projects/ while app is running
    - Manually trigger sync again (add temporary button) → new project appears
14. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify projectsImported count matches number of new project folders discovered
- Verify projectsUpdated = 0 on first sync, increases if re-run after name changes
- Verify totalSessionsSynced equals sum of sessions across all projects (max 5 per project)
- Verify project names match last segment of their filesystem path (or package.json name if available)
- Check database directly: `pnpm prisma:studio` → verify Project records have correct paths
- Verify AgentSession records reference correct projectId and userId

## Definition of Done

- [ ] All tasks completed
- [ ] Type checking passes (pnpm check-types)
- [ ] Linting passes (pnpm lint)
- [ ] Build succeeds (pnpm build)
- [ ] Manual testing confirms sync works on login
- [ ] Projects appear in both sidebar and Projects page after sync
- [ ] Sessions are synced and visible when expanding projects
- [ ] No console errors during sync process
- [ ] Code follows existing service/route/hook patterns
- [ ] Toast notifications provide user feedback
- [ ] Sync handles missing directories gracefully

## Notes

**Dependencies:**
- Requires existing `agentSessionService.syncProjectSessions()` (already implemented)
- Requires existing `useProjects()` hook and React Query setup
- Requires JWT authentication to be working

**Future Considerations:**
- Add manual "Refresh Projects" button in UI for on-demand sync
- Implement incremental sync (only check projects modified since last sync)
- Add progress indicator for large project libraries (e.g., 50+ projects)
- Consider WebSocket notifications when new projects are detected
- Potentially expand to sync Cursor projects (requires MD5 hashing logic from claudecodeui)
- Add settings toggle to enable/disable auto-sync on login

**Rollback Plan:**
If the feature causes issues, remove the `syncProjects.mutate()` call from `ProtectedLayout.tsx` to disable auto-sync. The sync endpoint will remain available for manual triggering later. No database migrations needed as we're using existing Project and AgentSession tables.
