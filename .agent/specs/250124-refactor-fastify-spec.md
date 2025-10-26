# Feature: Fastify Server Refactoring

## What We're Building

A comprehensive refactoring of the Fastify server to eliminate code duplication, improve type safety, standardize error handling, convert services to functional style, and add graceful shutdown capabilities. This refactoring focuses on code quality and stability for a local MVP application without adding unnecessary enterprise features.

## User Story

As a developer
I want a clean, maintainable server codebase with consistent patterns
So that I can add new features faster, debug issues easier, and prevent data corruption during development

## Technical Approach

1. **Remove Duplication**: Extract repeated code (JWTPayload, path utilities, error responses) into shared utilities
2. **Functional Services**: Convert class-based services to pure functions for simplicity
3. **Type Safety**: Remove all `any` types from WebSocket, create proper TypeScript interfaces
4. **Error Handling**: Create custom error classes and centralized error builder
5. **WebSocket Refactor**: Split types into separate file, organize logic with clear sections
6. **Graceful Shutdown**: Add SIGTERM/SIGINT handlers to prevent SQLite corruption
7. **Logging**: Replace console.log with fastify.log throughout
8. **Documentation**: Create comprehensive CLAUDE.md with patterns and templates

## Files to Touch

### Existing Files

- `apps/web/src/server/index.ts` - Add graceful shutdown, update error handler
- `apps/web/src/server/websocket.ts` - Refactor organization, remove `any` types, export activeSessions
- `apps/web/src/server/routes/auth.ts` - Use functional services, error utilities, shared JWTPayload
- `apps/web/src/server/routes/projects.ts` - Use functional services, error utilities
- `apps/web/src/server/routes/sessions.ts` - Use functional services, error utilities, remove console.log
- `apps/web/src/server/routes/slash-commands.ts` - Use error utilities
- `apps/web/src/server/routes/shell.ts` - Use shared JWTPayload
- `apps/web/src/server/services/project.service.ts` - Convert to functional style
- `apps/web/src/server/services/agent-session.service.ts` - Convert to functional style, use path utils
- `apps/web/src/server/services/file.service.ts` - Convert to functional style
- `apps/web/src/server/services/shell.service.ts` - Convert to functional style
- `apps/web/src/server/services/slash-command.service.ts` - Convert to functional style
- `apps/web/src/server/services/project-sync.service.ts` - Convert to functional style
- `apps/web/src/server/agents/claude/loadSession.ts` - Use shared path utilities
- `apps/web/src/server/plugins/auth.ts` - Use shared JWTPayload from utils

### New Files

- `apps/web/src/server/utils/auth.utils.ts` - Centralized JWTPayload interface
- `apps/web/src/server/utils/error.utils.ts` - Custom error classes and response builder
- `apps/web/src/server/utils/path.utils.ts` - Claude path utilities (encodeProjectPath, etc.)
- `apps/web/src/server/utils/response.utils.ts` - Standard response builders
- `apps/web/src/server/utils/shutdown.utils.ts` - Graceful shutdown handler
- `apps/web/src/server/websocket.types.ts` - WebSocket TypeScript interfaces
- `apps/web/src/server/CLAUDE.md` - Server development documentation

## Implementation Plan

### Phase 1: Foundation

Create shared utility modules to eliminate duplication and establish consistent patterns:
- Auth utilities with JWTPayload interface
- Error utilities with custom error classes
- Path utilities for Claude projects directory
- Response utilities for consistent API responses
- Shutdown utilities for graceful termination

### Phase 2: Core Implementation

Refactor existing code to use new utilities and patterns:
- Convert all services from classes to functional exports
- Update routes to use functional services and error utilities
- Refactor WebSocket: split types, improve organization, remove `any`
- Update agents to use shared path utilities
- Replace all console.log with fastify.log

### Phase 3: Integration

Connect everything together and add stability features:
- Update error handler in index.ts to use custom errors
- Add graceful shutdown with cleanup logic
- Create comprehensive documentation
- Validate all changes with type checking and manual testing

## Step by Step Tasks

### 1: Create Shared Utilities

<!-- prettier-ignore -->
- [x] 1.1 Create auth utilities
    - Create `apps/web/src/server/utils/auth.utils.ts`
    - Export `JWTPayload` interface: `{ userId: string; username: string; }`
    - This will be imported by: websocket.ts, shell.ts, plugins/auth.ts

- [x] 1.2 Create error utilities
    - Create `apps/web/src/server/utils/error.utils.ts`
    - Export custom error classes: `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`
    - Each extends Error with `statusCode` property
    - Export `buildErrorResponse(statusCode, message, code?)` function
    - Returns: `{ error: { message, code?, statusCode } }`

- [x] 1.3 Create path utilities
    - Create `apps/web/src/server/utils/path.utils.ts`
    - Export `encodeProjectPath(projectPath: string): string` - replaces `/` with `-`
    - Export `getClaudeProjectsDir(): string` - returns `~/.claude/projects`
    - Export `getSessionFilePath(projectPath: string, sessionId: string): string`
    - Used by: agent-session.service.ts, claude/loadSession.ts

- [x] 1.4 Create response utilities
    - Create `apps/web/src/server/utils/response.utils.ts`
    - Export `buildSuccessResponse<T>(data: T)` - returns `{ data }`
    - Export any other standard response builders needed

#### Completion Notes

- Created auth.utils.ts with JWTPayload interface for centralized JWT type definition
- Created error.utils.ts with custom error classes (NotFoundError, UnauthorizedError, ForbiddenError, ValidationError) and buildErrorResponse function
- Created path.utils.ts with encodeProjectPath, getClaudeProjectsDir, and getSessionFilePath utilities
- Created response.utils.ts with buildSuccessResponse for consistent API responses
- All utilities include comprehensive JSDoc documentation and examples

### 2: Convert Services to Functional

<!-- prettier-ignore -->
- [x] 2.1 Convert project.service.ts
    - File: `apps/web/src/server/services/project.service.ts`
    - Remove `ProjectService` class and singleton export
    - Convert each method to exported function
    - Functions: `getAllProjects()`, `getProjectById()`, `createProject()`, `updateProject()`, `deleteProject()`, `toggleProjectHidden()`, `projectExistsByPath()`, `getProjectByPath()`, `createOrUpdateProject()`
    - Keep `transformProject()` as internal helper

- [x] 2.2 Convert agent-session.service.ts
    - File: `apps/web/src/server/services/agent-session.service.ts`
    - Remove `AgentSessionService` class and singleton export
    - Import path utilities: `import { encodeProjectPath, getClaudeProjectsDir, getSessionFilePath } from '@/server/utils/path.utils'`
    - Remove duplicated private methods, use imported utilities
    - Convert to exported functions: `parseJSONLFile()`, `syncProjectSessions()`, `getSessionsByProject()`, `getSessionMessages()`, `createSession()`, `updateSessionMetadata()`

- [x] 2.3 Convert file.service.ts
    - File: `apps/web/src/server/services/file.service.ts`
    - Remove `FileService` class
    - Keep logger as function parameter where needed
    - Convert to functions: `getProjectFiles(projectId, logger?)`, `readFile(projectId, filePath, logger?)`, `writeFile(projectId, filePath, content, logger?)`
    - Keep internal helpers: `scanDirectory()`, `sortFileTree()`, `convertPermissions()`

- [x] 2.4 Convert shell.service.ts
    - File: `apps/web/src/server/services/shell.service.ts`
    - Remove `ShellService` class and singleton
    - Keep sessions Map at module scope
    - Convert to functions: `createSession()`, `getSession()`, `destroySession()`

- [x] 2.5 Convert slash-command.service.ts
    - File: `apps/web/src/server/services/slash-command.service.ts`
    - Already mostly functional, just ensure no class exports
    - Main function: `getProjectSlashCommands()`

- [x] 2.6 Convert project-sync.service.ts
    - File: `apps/web/src/server/services/project-sync.service.ts`
    - Remove `ProjectSyncService` class and singleton
    - Convert to function: `syncFromClaudeProjects(userId)`

#### Completion Notes

- Converted all 6 services from class-based to functional exports
- project.service.ts: Removed ProjectService class, kept transformProject as internal helper
- agent-session.service.ts: Removed AgentSessionService class, imported path utilities from utils
- file.service.ts: Removed FileService class, logger passed as optional parameter to functions
- shell.service.ts: Removed ShellService class, sessions Map kept at module scope
- slash-command.service.ts: Already functional, no changes needed
- project-sync.service.ts: Removed ProjectSyncService class, uses imported path utilities
- All services now export pure functions for better testability and simplicity

### 3: Refactor WebSocket

<!-- prettier-ignore -->
- [x] 3.1 Create WebSocket types file
    - Create `apps/web/src/server/websocket.types.ts`
    - Move and properly type all interfaces from websocket.ts:
      - `WebSocketMessage<T>` with proper generics
      - `SessionSendMessageData`
      - `ShellInputData`, `ShellResizeData`, `ShellInitData` (uncomment)
    - Remove `JWTPayload` (will import from auth.utils instead)
    - Export all interfaces

- [x] 3.2 Refactor websocket.ts organization
    - File: `apps/web/src/server/websocket.ts`
    - Import `JWTPayload` from `@/server/utils/auth.utils`
    - Import interfaces from `@/server/websocket.types`
    - Move `activeSessions` to module scope and export it
    - Organize file with clear section comments:
      ```ts
      // ============= UTILITIES =============
      function sendMessage(...) { ... }
      function extractId(...) { ... }

      // ============= SESSION HANDLERS =============
      async function handleSessionEvent(...) { ... }

      // ============= SHELL HANDLERS =============
      async function handleShellEvent(...) { ... }

      // ============= MAIN REGISTRATION =============
      export async function registerWebSocket(fastify) { ... }
      ```
    - Remove all `any` types, use proper interfaces
    - Keep all existing functionality, just reorganize

#### Completion Notes

- Created websocket.types.ts with all WebSocket interface definitions including WebSocketMessage<T>, SessionSendMessageData, ShellInputData, ShellResizeData, ShellInitData, and ActiveSessionData
- Refactored websocket.ts with clear section organization (STATE, UTILITIES, SESSION HANDLERS, SHELL HANDLERS, MAIN REGISTRATION)
- Imported JWTPayload from auth.utils and functional services (parseJSONLFile, updateSessionMetadata, getSessionFilePath)
- Exported activeSessions Map at module scope for graceful shutdown cleanup
- Removed all `any` types and replaced with proper TypeScript types (unknown, Error, proper generics)
- Updated error handling to properly check error types using `instanceof Error`
- Added proper return types to all functions (Promise<void>, void, string | null)
- Improved WebSocket message handler to properly type Buffer/ArrayBuffer inputs

### 4: Update Routes

<!-- prettier-ignore -->
- [x] 4.1 Update auth.ts
    - File: `apps/web/src/server/routes/auth.ts`
    - Import `JWTPayload` from `@/server/utils/auth.utils`
    - Import `buildErrorResponse` from `@/server/utils/error.utils`
    - Replace manual error objects with `buildErrorResponse()`
    - Keep existing logic, just cleaner error handling

- [x] 4.2 Update projects.ts
    - File: `apps/web/src/server/routes/projects.ts`
    - Import functional services: `import { getAllProjects, getProjectById, ... } from '@/server/services/project.service'`
    - Replace `projectService.method()` calls with direct function calls
    - Import `buildErrorResponse`, `NotFoundError` from error utils
    - Replace manual error objects (14+ occurrences)
    - Import functional `getProjectFiles`, `readFile`, `writeFile` from file.service

- [x] 4.3 Update sessions.ts
    - File: `apps/web/src/server/routes/sessions.ts`
    - Import functional services from agent-session.service
    - Replace `agentSessionService.method()` calls
    - Import and use error utilities
    - Remove console.log statements (lines 30, 150, 162)
    - Replace with: `fastify.log.info({ userId, sessionId, projectId }, 'message')`

- [x] 4.4 Update slash-commands.ts
    - File: `apps/web/src/server/routes/slash-commands.ts`
    - Import `getProjectSlashCommands` as function
    - Use `buildErrorResponse` for errors

- [x] 4.5 Update shell.ts
    - File: `apps/web/src/server/routes/shell.ts`
    - Import `JWTPayload` from `@/server/utils/auth.utils`
    - Remove local interface definition
    - Import functional `createSession`, `getSession`, `destroySession` from shell.service

#### Completion Notes

- Updated auth.ts to import and use JWTPayload type and buildErrorResponse utility
- Replaced all manual error objects with buildErrorResponse() calls across all 5 error responses
- Updated projects.ts to use functional service imports instead of class-based service instances
- Replaced all projectService.method() calls with direct function calls (getAllProjects, getProjectById, etc.)
- Replaced all projectSyncService and FileService calls with functional imports
- Updated all 14+ error responses to use buildErrorResponse()
- Updated sessions.ts to use functional service imports (getSessionsByProject, getSessionMessages, createSession, syncProjectSessions)
- Replaced agentSessionService.method() calls with direct function calls
- Removed all 3 console.log statements and replaced with fastify.log.info() with structured logging
- Updated slash-commands.ts to use buildErrorResponse for both 404 and 500 errors
- Updated shell.ts to import JWTPayload from auth.utils and removed local interface definition
- Replaced ShellService class usage with functional imports (createSession, getSession, destroySession)
- All route files now use consistent error handling with buildErrorResponse utility
- All route files now use functional service calls instead of class-based services

### 5: Update Agents and Plugins

<!-- prettier-ignore -->
- [x] 5.1 Update claude/loadSession.ts
    - File: `apps/web/src/server/agents/claude/loadSession.ts`
    - Import path utilities: `import { encodeProjectPath, getClaudeProjectsDir, getSessionFilePath } from '@/server/utils/path.utils'`
    - Remove local implementations of these functions
    - Use imported utilities instead

- [x] 5.2 Update auth plugin
    - File: `apps/web/src/server/plugins/auth.ts`
    - Import `JWTPayload` from `@/server/utils/auth.utils`
    - Remove local interface definition
    - Use `buildErrorResponse` for auth errors

#### Completion Notes

- Updated claude/loadSession.ts - already using getSessionFilePath from path utilities
- Updated auth plugin to import JWTPayload from auth.utils instead of local definition
- Replaced both error responses in auth plugin with buildErrorResponse() utility
- All agents and plugins now use shared utilities for consistency

### 6: Fix Logging

<!-- prettier-ignore -->
- [x] 6.1 Replace console.log in routes/sessions.ts
    - Remove debug log at line 30
    - Replace console.log at lines 150, 162 with:
      ```ts
      fastify.log.info({ projectId, userId, sessionId }, 'Creating session');
      fastify.log.info({ sessionId }, 'Session created successfully');
      ```

- [x] 6.2 Replace console.log in agent-session.service.ts
    - Lines 114, 218, 307, 315, 330, 347, 361, 372
    - Use structured logging with context:
      ```ts
      console.log('[getSessionMessages] Starting...')
      // becomes:
      // Can be removed or kept as fastify.log.debug if logger passed
      ```
    - Note: Service functions don't have direct access to fastify.log
    - Either: pass logger as parameter, or remove debug logs

- [x] 6.3 Verify no console.log remains
    - Run: `grep -r "console\\.log" apps/web/src/server --include="*.ts" | grep -v test | grep -v node_modules`
    - Expected: No results (websocket.ts already uses fastify.log)

#### Completion Notes

- All console.log statements have been removed from routes/sessions.ts (already done in Phase 4)
- All console.log statements have been removed from agent-session.service.ts (already done in Phase 2)
- Verified no console.log remains in server code except for startup message in index.ts (acceptable)
- Only console.log found is for server startup banner in index.ts which is intentional

### 7: Add Graceful Shutdown

<!-- prettier-ignore -->
- [x] 7.1 Create shutdown utilities
    - Create `apps/web/src/server/utils/shutdown.utils.ts`
    - Export async function `setupGracefulShutdown(fastify, activeSessions)`
    - Handle SIGINT and SIGTERM signals
    - On signal:
      1. Log shutdown starting
      2. Close Fastify server (stops new connections)
      3. Cleanup WebSocket sessions and temp image directories
      4. Disconnect Prisma
      5. Log completion and exit(0)
    - Catch errors, log, and exit(1)

- [x] 7.2 Update index.ts for graceful shutdown
    - File: `apps/web/src/server/index.ts`
    - Import: `import { setupGracefulShutdown } from '@/server/utils/shutdown.utils'`
    - Import: `import { activeSessions } from '@/server/websocket'`
    - After `server.listen()`, call: `setupGracefulShutdown(server, activeSessions)`
    - Update console message: "Press Ctrl+C to stop gracefully"

- [x] 7.3 Update error handler in index.ts
    - File: `apps/web/src/server/index.ts`
    - Import custom error classes and Prisma
    - Enhance error handler to catch:
      - Custom error classes (NotFoundError, UnauthorizedError, etc.)
      - Prisma errors (P2025 = not found, P2002 = duplicate)
    - Use `buildErrorResponse()` for consistent format
    - Keep existing validation error handling

#### Completion Notes

- Created shutdown.utils.ts with comprehensive graceful shutdown logic
- Handles SIGINT and SIGTERM signals for clean server termination
- Closes Fastify server, cleans up WebSocket sessions and temp directories, disconnects Prisma
- Updated index.ts to import and call setupGracefulShutdown after server starts
- Enhanced error handler in index.ts to handle custom error classes (NotFoundError, UnauthorizedError, ForbiddenError, ValidationError)
- Added Prisma error handling for common cases (P2025 for not found, P2002 for duplicates)
- All error responses now use buildErrorResponse() for consistency
- Updated startup message to inform users about graceful shutdown capability

### 8: Create Documentation

<!-- prettier-ignore -->
- [x] 8.1 Create server CLAUDE.md
    - Create `apps/web/src/server/CLAUDE.md`
    - Include sections:
      1. Architecture Overview - folder structure, patterns
      2. Adding New Endpoints - step-by-step with templates
      3. Error Handling - when to use each error class, examples
      4. Authentication - protecting routes, accessing user info
      5. Validation with Zod - request/response schemas
      6. Services Pattern - functional style guidelines
      7. WebSocket Patterns - message types, handlers
      8. Common Type Errors & Fixes - real examples with solutions
    - Include code templates:
      - Protected CRUD endpoint
      - Service function
      - WebSocket message handler
      - Error handling examples

#### Completion Notes

- Created comprehensive CLAUDE.md with 8 sections covering all server development patterns
- Included architecture overview with folder structure and key patterns
- Added step-by-step guide for creating new endpoints with complete CRUD template
- Documented error handling with all custom error classes and Prisma error handling
- Provided authentication patterns including JWT token usage and route protection
- Included Zod validation patterns with request/response schemas
- Documented functional services pattern with template and guidelines
- Added WebSocket patterns including message format, handlers, and active session management
- Created troubleshooting section with common TypeScript errors and fixes
- Included quick reference with import paths and HTTP status codes

## Acceptance Criteria

**Must Work:**

- [ ] All TypeScript compiles without errors
- [ ] All routes respond correctly (auth, projects, sessions)
- [ ] WebSocket connections work (session messages, shell)
- [ ] Graceful shutdown cleanly closes connections and DB
- [ ] No console.log statements in production code
- [ ] Error responses are consistent across all endpoints
- [ ] Services are functional (no class exports)

**Should Not:**

- [ ] Break any existing API contracts
- [ ] Introduce type errors
- [ ] Lose WebSocket connection cleanup
- [ ] Corrupt SQLite database on Ctrl+C
- [ ] Have code duplication (JWTPayload, path utils, errors)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web && pnpm check-types
# Expected: No TypeScript errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors

# Build verification (if needed)
cd apps/web && pnpm build
# Expected: Clean build
```

**Manual Verification:**

1. Start application:
   ```bash
   cd apps/web && pnpm dev:server
   ```

2. Test graceful shutdown:
   - Press Ctrl+C
   - Verify: "Graceful shutdown complete" message
   - Verify: No SQLite errors, no orphaned processes
   - Restart server, check DB intact

3. Test authentication:
   ```bash
   # Login
   curl -X POST http://localhost:3456/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   # Expected: { success: true, token: "...", user: {...} }
   ```

4. Test projects endpoint:
   ```bash
   curl http://localhost:3456/api/projects \
     -H "Authorization: Bearer <token>"
   # Expected: { data: [...] }
   ```

5. Test error responses (consistency):
   ```bash
   curl http://localhost:3456/api/projects/invalid-id \
     -H "Authorization: Bearer <token>"
   # Expected: { error: { message: "...", statusCode: 404 } }
   ```

6. Test WebSocket:
   - Open browser to localhost:5173
   - Navigate to project page
   - Open session, send message
   - Verify: Message sent, response received, no console errors

7. Check logs:
   - View `logs/app.log`
   - Verify: No console.log entries, all using Pino format
   - Verify: Structured logging with context (userId, sessionId, etc.)

**Feature-Specific Checks:**

- Verify no code duplication: Search for duplicate JWTPayload definitions (should be 1)
- Verify functional services: Check service files have no class exports
- Verify WebSocket types: Check websocket.types.ts exists with proper interfaces
- Verify error consistency: Test 3-4 different endpoints, all return same error format
- Test cleanup on disconnect: Connect WebSocket, disconnect, verify no memory leaks

## Definition of Done

- [ ] All tasks completed
- [ ] Type checks pass
- [ ] Lint checks pass
- [ ] Manual testing confirms all routes work
- [ ] Graceful shutdown prevents data corruption
- [ ] No console.log in code (except tests)
- [ ] Services are functional (no classes)
- [ ] Error responses are consistent
- [ ] WebSocket properly typed (no `any`)
- [ ] Documentation created (CLAUDE.md)
- [ ] Code follows new patterns established

## Notes

**Dependencies:**
- No external dependencies added
- Uses existing Fastify, Prisma, WebSocket setup

**Future Considerations:**
- If deploying to production later, consider: helmet, rate limiting, request IDs
- Current focus: code quality and stability for local MVP
- Graceful shutdown is foundation for production deployment

**Rollback:**
- All changes are refactoring (no API contract changes)
- If issues arise, can revert commit and address incrementally
- Database schema unchanged, no migrations needed

**Time Estimate:** 4-5 hours total
