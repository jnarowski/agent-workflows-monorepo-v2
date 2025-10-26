# Feature: Service Layer Refactoring to Domain-Grouped Structure

## What We're Building

We're restructuring the server services layer from a flat file structure to a domain-grouped architecture with improved separation of concerns. This refactoring will split large service files into smaller, focused modules organized by domain (project, session, file, shell, slash-command, sync), making the codebase more maintainable, testable, and scalable.

## User Story

As a developer working on the backend
I want services organized by domain with clear boundaries and small, focused files
So that I can easily find, understand, test, and extend functionality without navigating through large monolithic service files

## Technical Approach

We'll migrate from a flat service structure to domain-grouped organization:

1. **Create domain directories** under `services/` with subdirectories for each domain
2. **Split large services** (agent-session.service.ts, file.service.ts, project-sync.service.ts) into focused modules
3. **Extract shared utilities** to eliminate code duplication (path security, JSONL parsing)
4. **Add barrel exports** (index.ts) to maintain clean import paths
5. **Update all imports** across routes, tests, and other services
6. **Maintain backward compatibility** through index.ts exports

Key design decisions:
- Each service file should be < 200 lines
- Related functionality grouped by domain, not by file type
- Shared utilities extracted to `services/shared/`
- Barrel exports maintain clean import API: `@/server/services/session` instead of `@/server/services/session/session.service`

## Files to Touch

### Existing Files to Move/Split

- `apps/web/src/server/services/agent-session.service.ts` - Split into session/, move to session/session.service.ts + session-parser.service.ts + session-sync.service.ts
- `apps/web/src/server/services/agent-session.service.test.ts` - Move to session/session.service.test.ts
- `apps/web/src/server/services/file.service.ts` - Split into file/, move to file/file.service.ts + file-scanner.service.ts
- `apps/web/src/server/services/project.service.ts` - Move to project/project.service.ts
- `apps/web/src/server/services/shell.service.ts` - Move to shell/shell.service.ts
- `apps/web/src/server/services/slash-command.service.ts` - Move to slash-command/slash-command.service.ts
- `apps/web/src/server/services/slash-command.service.test.ts` - Move to slash-command/slash-command.service.test.ts
- `apps/web/src/server/services/project-sync.service.ts` - Split and move to sync/claude-sync.service.ts + sync/path-decoder.util.ts
- `apps/web/src/server/services/project-sync.service.test.ts` - Move to sync/claude-sync.service.test.ts

### Existing Files to Update (Imports)

- `apps/web/src/server/routes/projects.ts` - Update service imports
- `apps/web/src/server/routes/sessions.ts` - Update service imports
- `apps/web/src/server/routes/shell.ts` - Update service imports
- `apps/web/src/server/routes/slash-commands.ts` - Update service imports
- `apps/web/src/server/CLAUDE.md` - Update documentation with new structure

### New Files to Create

- `apps/web/src/server/services/project/index.ts` - Barrel export for project domain
- `apps/web/src/server/services/project/project.service.ts` - Moved from flat structure
- `apps/web/src/server/services/session/index.ts` - Barrel export for session domain
- `apps/web/src/server/services/session/session.service.ts` - Core CRUD operations (split from agent-session.service.ts)
- `apps/web/src/server/services/session/session-parser.service.ts` - JSONL parsing logic (split from agent-session.service.ts)
- `apps/web/src/server/services/session/session-sync.service.ts` - Sync operations (split from agent-session.service.ts)
- `apps/web/src/server/services/session/session.service.test.ts` - Moved test file
- `apps/web/src/server/services/file/index.ts` - Barrel export for file domain
- `apps/web/src/server/services/file/file.service.ts` - File read/write operations (split from file.service.ts)
- `apps/web/src/server/services/file/file-scanner.service.ts` - File tree scanning (split from file.service.ts)
- `apps/web/src/server/services/shell/index.ts` - Barrel export for shell domain
- `apps/web/src/server/services/shell/shell.service.ts` - Moved from flat structure
- `apps/web/src/server/services/slash-command/index.ts` - Barrel export for slash-command domain
- `apps/web/src/server/services/slash-command/slash-command.service.ts` - Moved from flat structure
- `apps/web/src/server/services/slash-command/slash-command.service.test.ts` - Moved test file
- `apps/web/src/server/services/sync/index.ts` - Barrel export for sync domain
- `apps/web/src/server/services/sync/claude-sync.service.ts` - Main sync logic (split from project-sync.service.ts)
- `apps/web/src/server/services/sync/path-decoder.util.ts` - Path decoding helpers (extracted from project-sync.service.ts)
- `apps/web/src/server/services/sync/claude-sync.service.test.ts` - Moved test file
- `apps/web/src/server/services/shared/path-security.util.ts` - Extracted path validation logic from file.service.ts
- `apps/web/src/server/services/shared/index.ts` - Barrel export for shared utilities

## Implementation Plan

### Phase 1: Foundation

Create the new domain directory structure and set up barrel exports. This establishes the organizational framework without breaking existing functionality.

**Tasks:**
- Create domain directories (project/, session/, file/, shell/, slash-command/, sync/, shared/)
- Create index.ts barrel exports for each domain
- Set up TypeScript path resolution for new structure

### Phase 2: Core Implementation

Split and migrate service files to the new structure. This is the main refactoring work where we break down large services into focused modules.

**Tasks:**
- Split agent-session.service.ts into 3 services
- Split file.service.ts into 2 services
- Split project-sync.service.ts and extract utilities
- Move remaining services to their domains
- Extract shared utilities (path-security.util.ts)
- Fix TypeScript issues (add missing imports, standardize logger usage)
- Move and update test files

### Phase 3: Integration

Update all import statements across the codebase and verify everything works correctly.

**Tasks:**
- Update route imports (projects.ts, sessions.ts, shell.ts, slash-commands.ts)
- Update test file imports
- Update cross-service imports
- Update documentation (CLAUDE.md)
- Run full test suite and type checking
- Delete old flat service files

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Create Domain Directory Structure

<!-- prettier-ignore -->
- [ ] 1.1 Create all domain directories
        - Create directories for each service domain
        - Command: `mkdir -p apps/web/src/server/services/{project,session,file,shell,slash-command,sync,shared}`
        - Expected: Directories created without errors

- [ ] 1.2 Create barrel export files
        - Create index.ts in each domain directory for clean imports
        - Files to create:
          - `apps/web/src/server/services/project/index.ts`
          - `apps/web/src/server/services/session/index.ts`
          - `apps/web/src/server/services/file/index.ts`
          - `apps/web/src/server/services/shell/index.ts`
          - `apps/web/src/server/services/slash-command/index.ts`
          - `apps/web/src/server/services/sync/index.ts`
          - `apps/web/src/server/services/shared/index.ts`
        - Each index.ts will export all functions from its domain services

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 2: Split and Move Session Services

<!-- prettier-ignore -->
- [ ] 2.1 Extract session parser service
        - Extract `parseJSONLFile` function from agent-session.service.ts
        - File: `apps/web/src/server/services/session/session-parser.service.ts`
        - Add JSDoc comments
        - Import dependencies: fs/promises, path
        - Export: parseJSONLFile function

- [ ] 2.2 Extract session sync service
        - Extract `syncProjectSessions` function from agent-session.service.ts
        - File: `apps/web/src/server/services/session/session-sync.service.ts`
        - Import parseJSONLFile from session-parser.service.ts
        - Import getClaudeProjectsDir, encodeProjectPath from path.utils
        - Import prisma from @/shared/prisma
        - Add JSDoc comments
        - Export: syncProjectSessions function

- [ ] 2.3 Create core session service
        - Extract remaining functions: getSessionsByProject, getSessionMessages, createSession, updateSessionMetadata
        - File: `apps/web/src/server/services/session/session.service.ts`
        - Import getAgent from @/server/agents
        - Import prisma from @/shared/prisma
        - Import types from @/shared/types/agent-session.types
        - Add JSDoc comments
        - Export all functions

- [ ] 2.4 Create session barrel export
        - File: `apps/web/src/server/services/session/index.ts`
        - Content:
          ```typescript
          export * from './session.service';
          export * from './session-parser.service';
          export * from './session-sync.service';
          ```

- [ ] 2.5 Move session test file
        - Move agent-session.service.test.ts to session/session.service.test.ts
        - Update imports to use new structure
        - File: `apps/web/src/server/services/session/session.service.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 3: Split and Move File Services

<!-- prettier-ignore -->
- [ ] 3.1 Extract file scanner service
        - Extract functions: getProjectFiles, scanDirectory, sortFileTree, convertPermissions
        - File: `apps/web/src/server/services/file/file-scanner.service.ts`
        - Import fs/promises, path
        - Import FastifyBaseLogger type
        - Import getProjectById from @/server/services/project
        - Import FileTreeItem type from @/shared/types/file.types
        - Add JSDoc comments
        - Export: getProjectFiles function

- [ ] 3.2 Create core file service
        - Extract functions: readFile, writeFile
        - File: `apps/web/src/server/services/file/file.service.ts`
        - Import fs/promises, path
        - Import FastifyBaseLogger type
        - Import getProjectById from @/server/services/project
        - Add path security validation (will be refactored to shared util later)
        - Add JSDoc comments
        - Export: readFile, writeFile functions

- [ ] 3.3 Create file barrel export
        - File: `apps/web/src/server/services/file/index.ts`
        - Content:
          ```typescript
          export * from './file.service';
          export * from './file-scanner.service';
          ```

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 4: Split and Move Sync Services

<!-- prettier-ignore -->
- [ ] 4.1 Extract path decoder utilities
        - Extract functions: decodeProjectPath, extractProjectDirectory, hasEnoughSessions
        - File: `apps/web/src/server/services/sync/path-decoder.util.ts`
        - Import fs/promises, fsSync, path, readline
        - Import getClaudeProjectsDir from @/server/utils/path.utils
        - Add JSDoc comments
        - Export all utility functions

- [ ] 4.2 Create claude sync service
        - Extract syncFromClaudeProjects function
        - File: `apps/web/src/server/services/sync/claude-sync.service.ts`
        - Import path-decoder utilities
        - Import createOrUpdateProject from @/server/services/project
        - Import syncProjectSessions from @/server/services/session
        - Import SyncProjectsResponse type
        - Add JSDoc comments
        - Export: syncFromClaudeProjects function

- [ ] 4.3 Create sync barrel export
        - File: `apps/web/src/server/services/sync/index.ts`
        - Content:
          ```typescript
          export * from './claude-sync.service';
          export * from './path-decoder.util';
          ```

- [ ] 4.4 Move sync test file
        - Move project-sync.service.test.ts to sync/claude-sync.service.test.ts
        - Update imports to use new structure
        - File: `apps/web/src/server/services/sync/claude-sync.service.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 5: Move Remaining Services

<!-- prettier-ignore -->
- [ ] 5.1 Move project service
        - Move project.service.ts to project/project.service.ts
        - No splitting needed, file is already well-sized (170 lines)
        - File: `apps/web/src/server/services/project/project.service.ts`
        - Create barrel export
        - File: `apps/web/src/server/services/project/index.ts`
        - Content: `export * from './project.service';`

- [ ] 5.2 Move shell service and fix imports
        - Move shell.service.ts to shell/shell.service.ts
        - Add missing import: `import type { FastifyBaseLogger } from 'fastify';`
        - Update import for getProjectById to use new path: `@/server/services/project`
        - File: `apps/web/src/server/services/shell/shell.service.ts`
        - Create barrel export
        - File: `apps/web/src/server/services/shell/index.ts`
        - Content: `export * from './shell.service';`

- [ ] 5.3 Move slash-command service
        - Move slash-command.service.ts to slash-command/slash-command.service.ts
        - Update import for getProjectById to use new path: `@/server/services/project`
        - File: `apps/web/src/server/services/slash-command/slash-command.service.ts`
        - Move test file: slash-command.service.test.ts to slash-command/
        - Create barrel export
        - File: `apps/web/src/server/services/slash-command/index.ts`
        - Content: `export * from './slash-command.service';`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 6: Extract Shared Utilities

<!-- prettier-ignore -->
- [ ] 6.1 Create path security utility
        - Extract duplicate path validation logic from file.service.ts
        - File: `apps/web/src/server/services/shared/path-security.util.ts`
        - Create function: validateProjectPath(projectPath: string, filePath: string): void
        - Import ForbiddenError from @/server/utils/error.utils
        - Add JSDoc comments
        - Export: validateProjectPath function

- [ ] 6.2 Update file services to use shared utility
        - Update file/file.service.ts to import and use validateProjectPath
        - Remove duplicate path validation code
        - File: `apps/web/src/server/services/file/file.service.ts`

- [ ] 6.3 Create shared barrel export
        - File: `apps/web/src/server/services/shared/index.ts`
        - Content: `export * from './path-security.util';`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 7: Update Route Imports

<!-- prettier-ignore -->
- [ ] 7.1 Update projects route imports
        - File: `apps/web/src/server/routes/projects.ts`
        - Change imports:
          - `@/server/services/project.service` → `@/server/services/project`
          - `@/server/services/project-sync.service` → `@/server/services/sync`
          - `@/server/services/file.service` → `@/server/services/file`

- [ ] 7.2 Update sessions route imports
        - File: `apps/web/src/server/routes/sessions.ts`
        - Change imports:
          - `@/server/services/agent-session.service` → `@/server/services/session`

- [ ] 7.3 Update shell route imports
        - File: `apps/web/src/server/routes/shell.ts`
        - Change imports:
          - `@/server/services/shell.service` → `@/server/services/shell`

- [ ] 7.4 Update slash-commands route imports
        - File: `apps/web/src/server/routes/slash-commands.ts`
        - Change imports:
          - `@/server/services/slash-command.service` → `@/server/services/slash-command`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 8: Update Test Imports

<!-- prettier-ignore -->
- [ ] 8.1 Update session test imports
        - File: `apps/web/src/server/services/session/session.service.test.ts`
        - Update all imports to use new barrel export paths
        - Change: `@/server/services/agent-session.service` → `@/server/services/session`
        - Verify test still passes

- [ ] 8.2 Update sync test imports
        - File: `apps/web/src/server/services/sync/claude-sync.service.test.ts`
        - Update imports:
          - `@/server/services/project-sync.service` → `@/server/services/sync`
          - `@/server/services/project.service` → `@/server/services/project`
          - `@/server/services/agent-session.service` → `@/server/services/session`
        - Verify test still passes

- [ ] 8.3 Update slash-command test imports
        - File: `apps/web/src/server/services/slash-command/slash-command.service.test.ts`
        - Update import: `@/server/services/slash-command.service` → `@/server/services/slash-command`
        - Verify test still passes

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### 9: Cleanup and Documentation

<!-- prettier-ignore -->
- [ ] 9.1 Delete old service files
        - Remove all old service files from flat structure:
          - `apps/web/src/server/services/agent-session.service.ts`
          - `apps/web/src/server/services/agent-session.service.test.ts`
          - `apps/web/src/server/services/file.service.ts`
          - `apps/web/src/server/services/project.service.ts`
          - `apps/web/src/server/services/shell.service.ts`
          - `apps/web/src/server/services/slash-command.service.ts`
          - `apps/web/src/server/services/slash-command.service.test.ts`
          - `apps/web/src/server/services/project-sync.service.ts`
          - `apps/web/src/server/services/project-sync.service.test.ts`
        - Command: `rm apps/web/src/server/services/*.ts`

- [ ] 9.2 Update CLAUDE.md documentation
        - File: `apps/web/src/server/CLAUDE.md`
        - Update "Folder Structure" section with new domain-grouped structure
        - Update import examples to use barrel exports
        - Add note about domain organization benefits

- [ ] 9.3 Run full verification
        - Run type checking: `pnpm check-types` from monorepo root
        - Run linting: `pnpm lint` from apps/web
        - Run all tests: `pnpm test` from apps/web
        - Expected: All checks pass with no errors

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Acceptance Criteria

**Must Work:**

- [ ] All existing routes continue to work without modification (except imports)
- [ ] All existing tests pass without failure
- [ ] Type checking passes with no errors
- [ ] Linting passes with no errors
- [ ] Each service file is under 200 lines of code
- [ ] All services have clear domain boundaries and single responsibilities
- [ ] Barrel exports allow clean imports: `@/server/services/session` instead of deep paths
- [ ] Shared utilities eliminate code duplication (path validation)
- [ ] All JSDoc comments are present on exported functions
- [ ] FastifyBaseLogger import added to shell.service.ts

**Should Not:**

- [ ] Break any existing API endpoints
- [ ] Change any business logic or functionality
- [ ] Introduce new runtime errors or warnings
- [ ] Cause performance degradation
- [ ] Leave orphaned or unused files in the codebase
- [ ] Have circular dependencies between services

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking (from monorepo root)
cd /Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2
pnpm check-types
# Expected: ✓ Type checking passed (no errors)

# Linting (from apps/web)
cd apps/web
pnpm lint
# Expected: No linting errors

# Unit tests (from apps/web)
pnpm test
# Expected: All tests pass
# Expected: Specific tests for session, sync, and slash-command services pass

# Build verification (from apps/web)
pnpm build
# Expected: Successful build with no errors

# Dev server start (from apps/web)
pnpm dev:server
# Expected: Server starts on port 3456 without errors
# Stop with Ctrl+C after verification
```

**Manual Verification:**

1. Start application: `pnpm dev` from apps/web directory
2. Verify backend starts without errors in console
3. Test API endpoints:
   - GET `/api/projects` - Should return projects list
   - POST `/api/projects/sync` - Should sync projects from Claude CLI
   - GET `/api/projects/:id/sessions` - Should return sessions for a project
   - GET `/api/projects/:id/files` - Should return file tree
   - GET `/api/projects/:id/slash-commands` - Should return slash commands
4. Check server logs: No errors or warnings related to missing modules
5. Verify WebSocket connections work (shell endpoint)

**Feature-Specific Checks:**

- Verify all service imports resolve correctly without "module not found" errors
- Check that barrel exports work: `import { getProjectById } from '@/server/services/project'`
- Confirm path security utility is used in file service (no code duplication)
- Verify session service is split correctly: session.service.ts, session-parser.service.ts, session-sync.service.ts
- Confirm old flat service files are deleted and not referenced anywhere
- Check that test files are in correct locations and pass
- Verify documentation is updated to reflect new structure

**Directory Structure Verification:**

```bash
# Verify new structure exists
ls -la apps/web/src/server/services/
# Expected: Directories: project/, session/, file/, shell/, slash-command/, sync/, shared/
# Expected: No .ts files in root (except possibly index.ts barrel exports)

# Verify each domain has barrel export
ls -la apps/web/src/server/services/*/index.ts
# Expected: index.ts exists in each domain directory

# Verify file counts per domain (should be small, focused files)
find apps/web/src/server/services -name "*.ts" -not -path "*/node_modules/*" -exec wc -l {} + | sort -n
# Expected: Most files under 200 lines
```

## Definition of Done

- [ ] All tasks completed
- [ ] All existing tests passing
- [ ] Type checking passes with no errors
- [ ] Linting passes with no errors
- [ ] Manual testing confirms all API endpoints work
- [ ] No console errors or warnings
- [ ] Code follows existing patterns and conventions
- [ ] All services have JSDoc comments on exported functions
- [ ] Documentation (CLAUDE.md) updated with new structure
- [ ] Old flat service files deleted
- [ ] No circular dependencies between services
- [ ] Each service file is under 200 lines
- [ ] Barrel exports working correctly for clean imports

## Notes

**Dependencies:**
- This refactoring has no external dependencies on other features
- All changes are internal to the services layer

**Future Considerations:**
- Consider adding integration tests for complex service interactions
- May want to add logging standardization (currently mixed between console.* and fastify.log)
- Consider creating service-specific error classes for better error handling
- Future: Add more comprehensive file service tests

**Rollback Plan:**
- If issues arise, revert by restoring old flat service files from git history
- Git commands:
  ```bash
  git checkout HEAD -- apps/web/src/server/services/
  git clean -fd apps/web/src/server/services/
  ```

**Testing Strategy:**
- Rely on existing unit tests to ensure functionality preserved
- Use type checking as primary safety net for import changes
- Manual API testing for integration verification
