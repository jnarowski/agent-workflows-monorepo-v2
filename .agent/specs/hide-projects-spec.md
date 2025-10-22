# Feature: Hide Projects

## What We're Building

A project visibility management feature that allows users to hide projects they're not actively working on. Hidden projects appear in a collapsible "Hidden" folder at the bottom of the sidebar, keeping the main project list focused while maintaining easy access to all projects.

## User Story

As a developer working with multiple projects
I want to hide projects I'm not currently using
So that my sidebar stays organized and I can focus on active projects while still accessing hidden ones when needed

## Technical Approach

We'll add an `is_hidden` boolean field to the Project model in the database. The backend will expose an endpoint to toggle this state via PATCH request. The frontend will filter projects into visible and hidden arrays, render them in separate sections, and provide a context menu option to toggle visibility. The hidden section will be a collapsible group that starts collapsed by default.

## Files to Touch

### Existing Files

- `apps/web/prisma/schema.prisma` - Add `is_hidden` field to Project model
- `apps/web/src/shared/types/project.types.ts` - Add `isHidden` to Project interface
- `apps/web/src/server/services/project.service.ts` - Add method to toggle hidden state
- `apps/web/src/server/routes/projects.ts` - Add PATCH endpoint for toggling hidden state
- `apps/web/src/server/schemas/project.schema.ts` - Add validation schema for hide action
- `apps/web/src/client/hooks/useProjects.ts` - Add mutation hook for toggling hidden state
- `apps/web/src/client/components/AppInnerSidebar.tsx` - Add UI for hiding/showing projects

### New Files

None - all changes are modifications to existing files

## Implementation Plan

### Phase 1: Foundation

Add the database schema change for the `is_hidden` field, update TypeScript types across the stack, and create the validation schema. This establishes the data model foundation for the feature.

### Phase 2: Core Implementation

Implement the backend service method and API endpoint to toggle project visibility. Create the frontend mutation hook to call this endpoint. This provides the complete data flow from UI to database.

### Phase 3: Integration

Update the AppInnerSidebar component to separate visible and hidden projects, add the context menu option, and create the collapsible hidden section. This completes the user-facing feature.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Database Schema Updates

<!-- prettier-ignore -->
- [x] 1.1 Add `is_hidden` field to Project model in Prisma schema
        - Add `is_hidden Boolean @default(false)` to Project model
        - File: `apps/web/prisma/schema.prisma`
        - Position: After the `path` field, before `created_at`
- [x] 1.2 Generate Prisma migration
        - Run: `cd apps/web && pnpm prisma migrate dev --name add_project_is_hidden`
        - Expected: Migration files created and database updated
- [x] 1.3 Regenerate Prisma client
        - Run: `cd apps/web && pnpm prisma generate`
        - Expected: Prisma client updated with new field

#### Completion Notes

- Added `is_hidden` boolean field to Project model with default value of false
- Created migration `20251022061500_add_project_is_hidden` and applied successfully
- Regenerated Prisma client with new field
- All existing projects will have `is_hidden` set to false by default

### 2: Type System Updates

<!-- prettier-ignore -->
- [x] 2.1 Add `isHidden` to Project interface
        - Add optional `isHidden?: boolean` field
        - File: `apps/web/src/shared/types/project.types.ts`
        - Position: After `path` field
- [x] 2.2 Update `UpdateProjectRequest` interface
        - Add optional `isHidden?: boolean` field to allow updating hidden state
        - File: `apps/web/src/shared/types/project.types.ts`
        - Position: In UpdateProjectRequest interface

#### Completion Notes

- Added optional `isHidden` field to Project interface for type safety across frontend and backend
- Updated UpdateProjectRequest interface to allow updating the hidden state
- Field is optional to maintain backward compatibility

### 3: Backend Validation Schema

<!-- prettier-ignore -->
- [x] 3.1 Update `updateProjectSchema` to include `isHidden`
        - Add `isHidden: z.boolean().optional()` to the schema object
        - File: `apps/web/src/server/schemas/project.schema.ts`
        - Position: In updateProjectSchema definition, after path field

#### Completion Notes

- Added `isHidden` validation to updateProjectSchema using Zod
- Field is optional boolean, allowing projects to be updated with or without changing hidden state
- Validation ensures only boolean values are accepted for the isHidden field

### 4: Backend Service Layer

<!-- prettier-ignore -->
- [x] 4.1 Add `toggleProjectHidden` method to ProjectService
        - Create async method that takes projectId and isHidden boolean
        - Use `updateProject` method internally to set is_hidden field
        - Return updated project or null if not found
        - File: `apps/web/src/server/services/project.service.ts`
        - Position: After `deleteProject` method

#### Completion Notes

- Added `toggleProjectHidden` convenience method to ProjectService
- Method delegates to existing `updateProject` method for consistency
- Returns updated project or null if project not found
- Properly typed with TypeScript for type safety

### 5: Backend API Routes

<!-- prettier-ignore -->
- [x] 5.1 Add PATCH `/api/projects/:id/hide` endpoint
        - Accept `{ isHidden: boolean }` in request body
        - Use authentication middleware
        - Call `projectService.updateProject` with isHidden field
        - Return 404 if project not found, 200 with updated project on success
        - File: `apps/web/src/server/routes/projects.ts`
        - Position: After DELETE endpoint, before file-related endpoints

#### Completion Notes

- Added dedicated PATCH `/api/projects/:id/hide` endpoint for toggling project visibility
- Endpoint uses authentication middleware to ensure secure access
- Validates isHidden boolean in request body
- Calls `projectService.toggleProjectHidden` method
- Returns 404 if project not found, 200 with updated project on success
- Follows existing route pattern for consistency

### 6: Frontend Data Layer

<!-- prettier-ignore -->
- [x] 6.1 Create `toggleProjectHidden` API function
        - Create async function that takes projectId and isHidden boolean
        - Make PATCH request to `/api/projects/${id}/hide`
        - Handle authentication with token
        - File: `apps/web/src/client/hooks/useProjects.ts`
        - Position: After `deleteProject` function, before hooks
- [x] 6.2 Create `useToggleProjectHidden` mutation hook
        - Use `useMutation` with `toggleProjectHidden` function
        - On success: update both list and detail caches optimistically
        - Show toast notification on success/error
        - Invalidate project queries to ensure consistency
        - File: `apps/web/src/client/hooks/useProjects.ts`
        - Position: After `useDeleteProject` hook

#### Completion Notes

- Added `toggleProjectHidden` API function that calls PATCH `/api/projects/:id/hide` endpoint
- Created `useToggleProjectHidden` mutation hook with TanStack Query
- Hook updates both list and detail caches optimistically for instant UI updates
- Shows contextual toast notifications ("Project hidden successfully" / "Project unhidden successfully")
- Invalidates project queries to ensure consistency across the app
- Follows existing patterns for error handling and authentication

### 7: Frontend UI Components

<!-- prettier-ignore -->
- [x] 7.1 Import `EyeOff` and `Eye` icons from lucide-react
        - Add to existing imports at top of file
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: In lucide-react import statement (line 5-13)
- [x] 7.2 Import `useToggleProjectHidden` hook
        - Add to existing hook imports
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: After useProjects import (line 39)
- [x] 7.3 Add state for hidden projects folder collapse
        - Add `const [isHiddenOpen, setIsHiddenOpen] = React.useState(false)`
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: After `showAllSessions` state (around line 78)
- [x] 7.4 Get toggle mutation hook instance
        - Add `const toggleHiddenMutation = useToggleProjectHidden()`
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: After useAgentSessions hook (around line 84)
- [x] 7.5 Update projects memo to separate visible and hidden
        - Split projects array into `visibleProjects` and `hiddenProjects`
        - Filter based on `isHidden` field
        - Maintain alphabetical sorting for both arrays
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: Modify existing projects useMemo (lines 87-99)
- [x] 7.6 Add hide/unhide handler function
        - Create `handleToggleHidden` function that calls mutation
        - Prevent event propagation to avoid opening project
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: After `toggleProject` function (around line 112)
- [x] 7.7 Add hide/unhide option to dropdown menu
        - Add conditional menu item showing "Hide Project" or "Unhide Project"
        - Use EyeOff icon for hide action, Eye icon for unhide
        - Call `handleToggleHidden` on click
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: In DropdownMenuContent, after "Edit Project" option (around line 192)
- [x] 7.8 Update visible projects rendering
        - Change projects.map to visibleProjects.map
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: In SidebarMenu mapping (line 146)
- [x] 7.9 Add Hidden projects section
        - Add second SidebarGroup after visible projects group
        - Use Collapsible component controlled by `isHiddenOpen`
        - Show count of hidden projects in label
        - Map over `hiddenProjects` array with same structure as visible
        - Only render if hiddenProjects.length > 0
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: After closing tag of first SidebarGroup (around line 257)
- [x] 7.10 Fix ESLint warning for useEffect dependencies
        - Add `openProjects` to dependency array of useEffect on line 115
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`
        - Position: Line 119

#### Completion Notes

- Added Eye/EyeOff icon imports from lucide-react for hide/unhide visual indicators
- Imported and initialized useToggleProjectHidden mutation hook
- Added isHiddenOpen state to control collapsible hidden projects section (defaults to false/collapsed)
- Refactored projects memo to separate into visibleProjects and hiddenProjects arrays with proper filtering and sorting
- Created handleToggleHidden handler with event propagation prevention
- Added conditional hide/unhide menu item in dropdown that shows correct icon and text based on project state
- Updated main projects list to render only visibleProjects
- Added complete Hidden projects section with collapsible group showing count, all same functionality as visible projects
- Fixed ESLint warning by adding openProjects to useEffect dependency array
- All UI components follow existing design patterns and maintain consistency

## Acceptance Criteria

**Must Work:**

- [ ] Projects can be hidden via context menu "Hide Project" option
- [ ] Hidden projects appear in collapsible "Hidden" section at bottom of sidebar
- [ ] Hidden section shows count of hidden projects (e.g., "Hidden (3)")
- [ ] Hidden section is collapsed by default and can be expanded
- [ ] Projects can be unhidden via "Unhide Project" option in context menu
- [ ] Unhidden projects immediately move back to main project list
- [ ] Project hidden state persists across page refreshes
- [ ] Active project can be hidden and remains accessible in hidden section
- [ ] Sessions for hidden projects still load when project is expanded
- [ ] Sorting (alphabetical) is maintained in both visible and hidden sections

**Should Not:**

- [ ] Break existing project CRUD operations (create, update, delete)
- [ ] Break existing session functionality
- [ ] Cause navigation issues when hiding active project
- [ ] Show hidden projects in main list
- [ ] Lose project data when toggling hidden state
- [ ] Cause performance issues with large project lists

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

# Build verification
cd apps/web && pnpm build
# Expected: Successful build with no errors

# Database schema check
cd apps/web && pnpm prisma validate
# Expected: Schema is valid
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: Project list in sidebar
3. Verify: Right-click a project shows "Hide Project" option
4. Click "Hide Project" and verify:
   - Project disappears from main list
   - "Hidden" section appears at bottom with count
   - Project appears in hidden section when expanded
5. Click "Unhide Project" in hidden section and verify:
   - Project moves back to main list
   - Hidden count decreases
   - Hidden section disappears if count reaches 0
6. Test edge cases:
   - Hide currently active project (should stay accessible)
   - Hide project with sessions (sessions should still load)
   - Refresh page (hidden state should persist)
7. Check console: No errors or warnings

**Feature-Specific Checks:**

- Hidden section is collapsed by default on initial load
- Alphabetical sorting is maintained in both sections
- Session count and session list work correctly for hidden projects
- Context menu shows correct option (Hide vs Unhide) based on state
- Clicking project in hidden section navigates correctly
- Multiple projects can be hidden/unhidden in succession without issues

## Definition of Done

- [ ] All tasks completed
- [ ] Database migration applied successfully
- [ ] Type checks passing
- [ ] Lint checks passing
- [ ] Build succeeds without errors
- [ ] Manual testing confirms all acceptance criteria
- [ ] No console errors or warnings
- [ ] Code follows existing patterns (React hooks, Prisma, Fastify)
- [ ] Hidden state persists in database
- [ ] UI is responsive and follows existing design patterns

## Notes

**Dependencies:**
- Requires Prisma migration to be run before backend changes take effect
- Frontend changes depend on backend API being deployed

**Future Considerations:**
- Could add bulk hide/unhide actions
- Could add keyboard shortcuts for hide/unhide
- Could add filter/search to hidden section if list grows large
- Could add "Recently Hidden" indicator for 24 hours after hiding
- Could add ability to customize hidden section label or icon

**Rollback:**
- If issues arise, can revert migration with `prisma migrate resolve --rolled-back <migration-name>`
- Frontend changes can be reverted via git without data loss
- Hidden state defaults to false, so existing projects remain visible
