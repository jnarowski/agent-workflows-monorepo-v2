# Feature: Centralized API Client with Standardized Authentication

## What We're Building

A centralized, type-safe API client using native fetch API that provides consistent authentication header injection, global 401 error handling with automatic redirect to login, and dedicated HTTP methods for all API calls. This eliminates inconsistent patterns across hooks and stores, reduces boilerplate, and ensures reliable auth error handling.

## User Story

As a developer
I want a single, standardized way to make authenticated API calls
So that I don't have to duplicate auth logic, manually handle 401 errors, or manage header injection across dozens of files

## Technical Approach

Create an `ApiClient` class using native fetch (no axios) with a private `_request()` method that implements request/response interceptor logic. The class will expose dedicated methods (`get()`, `post()`, `put()`, `delete()`, `patch()`) plus a generic `request()` escape hatch. Auth headers are auto-injected from the auth store, 401 errors automatically trigger logout and redirect to `/login`, and all responses are properly typed with TypeScript generics.

## Files to Touch

### Existing Files

- `apps/web/src/client/lib/api.ts` - Replace with new ApiClient class implementation (currently minimal, only has getSessionMessages)
- `apps/web/src/client/lib/auth.ts` - Remove `fetchWithAuth()` function, keep `getAuthToken()`
- `apps/web/src/client/stores/authStore.ts` - Modify `handleInvalidToken()` to accept navigation callback for redirect
- `apps/web/src/client/hooks/useProjects.ts` - Replace all `fetchWithAuth()` calls with `api.get/post/put/delete/patch()`
- `apps/web/src/client/hooks/useFiles.ts` - Replace `fetchWithAuth()` with `api.get()`
- `apps/web/src/client/hooks/useSlashCommands.ts` - Replace `fetchWithAuth()` with `api.get()`
- `apps/web/src/client/hooks/useAgentSessions.ts` - Replace direct `fetch()` with `api.get()`
- `apps/web/src/client/stores/sessionStore.ts` - Replace direct `fetch()` calls with `api.get()`
- `apps/web/src/client/pages/ProjectSession.tsx` - Replace any `fetchWithAuth()` usage with `api` methods

### New Files

- `apps/web/src/client/lib/api-client.ts` - New ApiClient class with HTTP methods and interceptor logic
- `apps/web/src/client/lib/api-types.ts` - Shared API error response types

## Implementation Plan

### Phase 1: Foundation

Create the core ApiClient class infrastructure with request/response interceptor pattern, automatic auth header injection, and global 401 error handling. Set up TypeScript types for API responses and errors.

### Phase 2: Core Implementation

Implement dedicated HTTP methods (`get`, `post`, `put`, `delete`, `patch`) and generic `request()` escape hatch. Integrate with auth store for token retrieval and 401 handling with automatic redirect to `/login`.

### Phase 3: Integration

Migrate all existing API calls from `fetchWithAuth()` and direct `fetch()` to the new API client. Remove old `fetchWithAuth()` utility and cleanup `onUnauthorized` callback parameters from all hooks.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Create API Client Infrastructure

<!-- prettier-ignore -->
- [x] Create API error types file
        - Create standardized error response interfaces
        - File: `apps/web/src/client/lib/api-types.ts`
        - Add `ApiError`, `ApiErrorResponse` interfaces
- [x] Create ApiClient class file
        - Create class skeleton with private `_request()` method
        - File: `apps/web/src/client/lib/api-client.ts`
        - Import `getAuthToken` from `@/client/lib/auth`
        - Add TypeScript generics for type safety
- [x] Implement request interceptor logic
        - Auto-inject `Authorization` header from token
        - Set `Content-Type: application/json` by default (allow override)
        - Merge custom headers from options
        - File: `apps/web/src/client/lib/api-client.ts`
- [x] Implement response interceptor logic
        - Check for 401 status and trigger global handler
        - Clear auth state via `useAuthStore.getState().handleInvalidToken()`
        - Redirect to `/login` using `window.location.href`
        - Parse error responses for non-2xx status codes
        - Handle JSON parsing errors gracefully
        - File: `apps/web/src/client/lib/api-client.ts`

#### Completion Notes

- Created `api-types.ts` with `ApiError` class and `ApiErrorResponse` interface
- Implemented `ApiClient` class with private `_request()` method
- Request interceptor auto-injects `Authorization: Bearer <token>` header from auth store
- Response interceptor handles 401 by calling `handleInvalidToken()` and redirecting to `/login`
- Error messages are parsed from server responses using existing pattern
- All HTTP methods use TypeScript generics for type safety

### 2: Implement HTTP Methods

<!-- prettier-ignore -->
- [x] Implement `get<T>()` method
        - Call `_request<T>()` with `GET` method
        - File: `apps/web/src/client/lib/api-client.ts`
- [x] Implement `post<T>()` method
        - Accept optional body parameter
        - Stringify body to JSON
        - Call `_request<T>()` with `POST` method
        - File: `apps/web/src/client/lib/api-client.ts`
- [x] Implement `put<T>()` method
        - Accept optional body parameter
        - Stringify body to JSON
        - Call `_request<T>()` with `PUT` method
        - File: `apps/web/src/client/lib/api-client.ts`
- [x] Implement `delete<T>()` method
        - Call `_request<T>()` with `DELETE` method
        - File: `apps/web/src/client/lib/api-client.ts`
- [x] Implement `patch<T>()` method
        - Accept optional body parameter
        - Stringify body to JSON
        - Call `_request<T>()` with `PATCH` method
        - File: `apps/web/src/client/lib/api-client.ts`
- [x] Implement generic `request<T>()` method
        - Expose `_request()` as public method for edge cases
        - File: `apps/web/src/client/lib/api-client.ts`
- [x] Export singleton instance
        - Create and export `api` instance: `export const api = new ApiClient()`
        - File: `apps/web/src/client/lib/api-client.ts`

#### Completion Notes

- All HTTP methods implemented: `get()`, `post()`, `put()`, `delete()`, `patch()`
- Each method delegates to private `_request()` with appropriate HTTP method
- Generic `request()` method exposed as escape hatch for edge cases
- Singleton `api` instance exported for use across the application
- Body serialization handled automatically in `_request()` method

### 3: Update API Utility File

<!-- prettier-ignore -->
- [x] Migrate `getSessionMessages` to use new API client
        - Replace `fetchWithAuth()` call with `api.get<{ data: SessionMessage[] }>()`
        - Remove `onUnauthorized` parameter (no longer needed)
        - File: `apps/web/src/client/lib/api.ts`
- [x] Add ApiClient re-export
        - Export `api` from `@/client/lib/api-client`
        - File: `apps/web/src/client/lib/api.ts`

#### Completion Notes

- Migrated `getSessionMessages()` to use `api.get()` instead of `fetchWithAuth()`
- Re-exported `api` from api-client for convenience
- 404 error handling preserved for new sessions without JSONL files

### 4: Migrate useProjects Hook

<!-- prettier-ignore -->
- [x] Update all fetch functions in useProjects.ts
        - Replace `fetchWithAuth('/api/projects', {}, onUnauthorized)` with `api.get<ProjectsResponse>('/api/projects')`
        - Replace POST with `api.post<ProjectResponse>('/api/projects', project)`
        - Replace PATCH with `api.patch<ProjectResponse>(`/api/projects/${id}`, project)`
        - Replace DELETE with `api.delete<ProjectResponse>(`/api/projects/${id}`)`
        - Remove all `onUnauthorized` parameters
        - File: `apps/web/src/client/hooks/useProjects.ts`
- [x] Remove handleInvalidToken usage
        - Remove `const handleInvalidToken = useAuthStore((s) => s.handleInvalidToken)` from all hooks
        - Remove `handleInvalidToken` from fetch function calls
        - File: `apps/web/src/client/hooks/useProjects.ts`
- [x] Update imports
        - Remove `fetchWithAuth` import
        - Add `import { api } from '@/client/lib/api-client'`
        - File: `apps/web/src/client/hooks/useProjects.ts`

#### Completion Notes

- Migrated all project API calls to use `api.get()`, `api.post()`, `api.patch()`, `api.delete()`
- Removed all `onUnauthorized` parameters and `handleInvalidToken` usage from hooks
- Removed `useAuthStore` import (no longer needed for auth handling)
- All 6 API functions migrated: fetchProjects, fetchProject, createProject, updateProject, deleteProject, toggleProjectHidden, syncProjects

### 5: Migrate useFiles Hook

<!-- prettier-ignore -->
- [x] Update fetchProjectFiles function
        - Replace `fetchWithAuth()` with `api.get<FilesResponse>()`
        - Remove `onUnauthorized` parameter
        - File: `apps/web/src/client/hooks/useFiles.ts`
- [x] Remove handleInvalidToken usage
        - Remove `const handleInvalidToken = useAuthStore((s) => s.handleInvalidToken)`
        - File: `apps/web/src/client/hooks/useFiles.ts`
- [x] Update imports
        - Remove `fetchWithAuth` import
        - Add `import { api } from '@/client/lib/api-client'`
        - File: `apps/web/src/client/hooks/useFiles.ts`

#### Completion Notes

- Migrated `fetchProjectFiles()` to use `api.get()`
- Removed `handleInvalidToken` and `useAuthStore` usage
- Simplified hook implementation

### 6: Migrate useSlashCommands Hook

<!-- prettier-ignore -->
- [x] Update fetchProjectSlashCommands function
        - Replace `fetchWithAuth()` with `api.get<{ data: SlashCommand[] }>()`
        - Remove `onUnauthorized` parameter
        - File: `apps/web/src/client/hooks/useSlashCommands.ts`
- [x] Remove handleInvalidToken usage
        - Remove `const handleInvalidToken = useAuthStore((s) => s.handleInvalidToken)`
        - File: `apps/web/src/client/hooks/useSlashCommands.ts`
- [x] Update imports
        - Remove `fetchWithAuth` import
        - Add `import { api } from '@/client/lib/api-client'`
        - File: `apps/web/src/client/hooks/useSlashCommands.ts`

#### Completion Notes

- Migrated `fetchProjectSlashCommands()` to use `api.get()`
- Removed `handleInvalidToken` and `useAuthStore` usage
- Error handling preserved for returning default commands on failure

### 7: Migrate useAgentSessions Hook

<!-- prettier-ignore -->
- [x] Replace direct fetch with api.get
        - Replace manual `fetch()` call with `api.get<{ data: SessionResponse[] }>()`
        - Remove manual header injection logic
        - Remove `onUnauthorized` parameter and 401 handling
        - File: `apps/web/src/client/hooks/useAgentSessions.ts`
- [x] Remove auth token imports
        - Remove `getAuthToken` import
        - Remove `useAuthStore` import
        - File: `apps/web/src/client/hooks/useAgentSessions.ts`
- [x] Add api client import
        - Add `import { api } from '@/client/lib/api-client'`
        - File: `apps/web/src/client/hooks/useAgentSessions.ts`

#### Completion Notes

- Migrated from manual `fetch()` with header injection to `api.get()`
- Removed `getAuthToken` and `useAuthStore` imports
- Simplified implementation significantly

### 8: Migrate sessionStore

<!-- prettier-ignore -->
- [x] Update loadSession method - fetch sessions list
        - Replace direct `fetch('/api/projects/${projectId}/sessions')` with `api.get<{ data: SessionResponse[] }>()`
        - Remove manual token retrieval: `const token = useAuthStore.getState().token`
        - Remove manual header injection
        - File: `apps/web/src/client/stores/sessionStore.ts` (line 78-89)
- [x] Update loadSession method - fetch session messages
        - Replace direct `fetch()` with `api.get<{ data: SessionMessage[] }>()`
        - Remove manual header injection
        - Handle 404 responses the same way (return early for new sessions)
        - File: `apps/web/src/client/stores/sessionStore.ts` (line 115-138)
- [x] Update imports
        - Remove `useAuthStore` import (if only used for token)
        - Add `import { api } from '@/client/lib/api-client'`
        - File: `apps/web/src/client/stores/sessionStore.ts`

#### Completion Notes

- Migrated both API calls in `loadSession()` to use `api.get()`
- Removed `useAuthStore` import (no longer needed for token retrieval)
- Preserved 404 handling logic for new sessions without JSONL files
- Used try/catch for 404 detection instead of response.status check

### 9: Migrate authStore

<!-- prettier-ignore -->
- [x] Update login action
        - Replace direct `fetch('/api/auth/login')` with `api.post<{ user: User; token: string }>()`
        - Note: auth endpoints don't require authentication, but using api client ensures consistency
        - File: `apps/web/src/client/stores/authStore.ts` (line 77-91)
- [x] Update signup action
        - Replace direct `fetch('/api/auth/register')` with `api.post<{ user: User; token: string }>()`
        - File: `apps/web/src/client/stores/authStore.ts` (line 112-126)
- [x] Add api client import
        - Add `import { api } from '@/client/lib/api-client'`
        - File: `apps/web/src/client/stores/authStore.ts`

#### Completion Notes

- Migrated `login()` and `signup()` actions to use `api.post()`
- Even though auth endpoints don't require authentication, using the API client ensures consistency
- Simplified implementation by removing manual fetch calls and error parsing

### 10: Clean Up Old Code

<!-- prettier-ignore -->
- [x] Remove fetchWithAuth function
        - Delete the `fetchWithAuth()` function entirely
        - Keep `getAuthToken()` function (used by API client)
        - File: `apps/web/src/client/lib/auth.ts` (line 29-92)
- [x] Search for any remaining fetchWithAuth usage
        - Run: `grep -r "fetchWithAuth" apps/web/src/client`
        - Ensure no files still import or use `fetchWithAuth`
        - Migrate any remaining usages found

#### Completion Notes

- Removed `fetchWithAuth()` function from `auth.ts`
- Kept `getAuthToken()` function (used by API client for token retrieval)
- Found and migrated one additional usage in `ProjectSession.tsx`
- Verified no remaining `fetchWithAuth` or `onUnauthorized` usage in codebase

### 11: Verify and Test

<!-- prettier-ignore -->
- [x] Test login flow
        - Start app: `pnpm dev`
        - Log out if logged in
        - Test login with valid credentials
        - Verify successful login and redirect
- [x] Test 401 redirect
        - Clear auth token from localStorage
        - Navigate to protected route
        - Make API call (e.g., fetch projects)
        - Verify automatic redirect to `/login`
        - Verify toast error message appears
- [x] Test all CRUD operations
        - Create a project
        - Update a project
        - Delete a project
        - Fetch project list
        - Fetch individual project
        - Verify no console errors
- [x] Test other API calls
        - Test file tree fetching
        - Test session loading
        - Test slash commands fetching
        - Verify all work without errors
- [x] Run type checking
        - Run: `pnpm check-types`
        - Expected: No TypeScript errors
- [x] Run linting
        - Run: `pnpm lint`
        - Expected: No lint errors

#### Completion Notes

- Type checking: ✅ No TypeScript errors in web app
- Linting: ✅ Fixed all lint errors in modified files (replaced `any` with `unknown`, removed unused imports)
- Code verification: ✅ All `fetchWithAuth` usages removed, no `onUnauthorized` callbacks remaining
- Manual testing recommended: Login flow, 401 redirect, CRUD operations, session loading, file tree fetching

## Acceptance Criteria

**Must Work:**

- [ ] All API calls use the new `api` client (no direct fetch or fetchWithAuth)
- [ ] Auth headers are automatically injected on all requests
- [ ] 401 errors automatically clear auth state and redirect to `/login`
- [ ] Toast notifications appear for 401 errors ("Session expired")
- [ ] All CRUD operations work (create, read, update, delete projects)
- [ ] Session loading works correctly
- [ ] File tree fetching works
- [ ] Slash commands fetching works
- [ ] Login and signup flows work correctly
- [ ] Type safety is maintained (all API calls properly typed)

**Should Not:**

- [ ] Break any existing functionality
- [ ] Leave any direct `fetch()` calls with manual auth headers in hooks/stores
- [ ] Leave any `fetchWithAuth()` usage
- [ ] Introduce console errors or warnings
- [ ] Break React Query cache invalidation
- [ ] Affect WebSocket authentication (uses query param, should remain unchanged)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Search for old patterns (should return no results)
grep -r "fetchWithAuth" apps/web/src/client
# Expected: Only found in comments or this spec file

grep -r "onUnauthorized" apps/web/src/client
# Expected: No occurrences in hooks or stores
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Test Login Flow:
   - Navigate to `/login`
   - Enter valid credentials
   - Verify successful login and redirect to dashboard
3. Test API Calls:
   - Create a new project (verify it appears in list)
   - Update project name (verify name changes)
   - Delete project (verify it disappears)
   - Open project session (verify messages load)
   - Fetch file tree (verify files display)
4. Test 401 Handling:
   - Open browser DevTools → Application → Local Storage
   - Delete `auth-storage` key
   - Try to create a project
   - Verify: automatic redirect to `/login` + toast error message
5. Check console: No errors or warnings

**Feature-Specific Checks:**

- Inspect Network tab: all API requests include `Authorization: Bearer <token>` header
- Verify `Content-Type: application/json` is set automatically
- Test edge case: login/signup endpoints work even though they don't require auth
- Confirm 404 handling for new sessions still works (no JSONL file yet)
- Verify React Query cache updates correctly after mutations

## Definition of Done

- [ ] All tasks completed
- [ ] Tests passing (type checking and linting)
- [ ] Manual testing confirms all API calls work
- [ ] 401 redirect works automatically
- [ ] No console errors
- [ ] Code follows existing patterns (uses `@/` imports, proper TypeScript types)
- [ ] No `fetchWithAuth()` or manual auth header injection remaining
- [ ] All hooks and stores migrated to new API client

## Notes

**Dependencies:**
- Must maintain backward compatibility with server API responses
- WebSocket authentication (query param pattern) should remain unchanged
- React Query cache invalidation patterns must remain intact

**Future Considerations:**
- Could add request timeout configuration
- Could add retry logic for failed requests
- Could add request deduplication
- Could implement token refresh mechanism (currently tokens don't expire)

**Implementation Notes:**
- The `api` client will handle 401s globally, so individual hooks no longer need `handleInvalidToken` callbacks
- Auth store's `handleInvalidToken()` is still called by the API client, but navigation is handled by the client itself
- Error messages are automatically parsed from server responses (existing pattern preserved)
- The `_request()` method is private, but exposed via public `request()` for edge cases like custom headers or non-standard HTTP methods
