# Workflow WebSocket Event System Refactor

**Status**: draft
**Created**: 2025-01-05
**Package**: apps/web
**Estimated Effort**: 6-8 hours

## Overview

Refactor workflow WebSocket event system from 12 event types to 4 hierarchical events, remove Zustand store (~200 lines), migrate to React Query-only state management with optimistic updates, optimize list queries to reduce over-fetching by 60%, and implement debounced background refetch for data consistency.

## User Story

As a developer maintaining the workflow system
I want a simpler, more maintainable WebSocket event architecture
So that I can easily add new features, reduce bugs from dual state management, and provide instant UI updates with better data consistency

## Technical Approach

Replace current dual state management (Zustand + React Query with 500ms delay hack) with React Query-only pattern using optimistic updates via `setQueryData`. Consolidate 12 granular event types into 4 hierarchical events aligned with database tables. Optimize backend queries to fetch minimal data for list views. Broadcast all events to project room (industry best practice), with client-side filtering handled efficiently by React Query cache.

## Key Design Decisions

1. **React Query Only**: Remove Zustand workflow store entirely. React Query cache becomes single source of truth for server state. Optimistic updates via `setQueryData` provide instant UI, debounced `invalidateQueries` (5s) provides safety net.

2. **Hierarchical Event Naming**: Use `workflow:execution:*` namespace with colon delimiters (industry standard). Enables prefix filtering, clear hierarchy, and future extensibility (e.g., `workflow:definition:created`).

3. **Project Room Broadcasting**: Emit all events to `project:${projectId}` room only (not execution-specific rooms). Follows Slack/Trello/GitHub pattern. Simpler architecture, all views stay in sync automatically, React Query handles filtering efficiently.

4. **Optimized List Queries**: Fetch only 8 fields + `_count.steps` for list views. Remove nested `steps[]`, `events[]`, `artifacts[]` arrays. Reduces payload size by ~60%, improves performance.

5. **Debounced Background Refetch**: After optimistic update, schedule background refetch 5s later (resets on new events). Provides safety net if WebSocket drops events or optimistic update incorrect.

## Architecture

### File Structure

```
apps/web/
├── src/
│   ├── shared/types/
│   │   └── websocket.types.ts          # ⚠️ REWRITE - 4 new event types
│   │
│   ├── server/domain/workflow/
│   │   ├── services/
│   │   │   ├── events/
│   │   │   │   ├── emitWorkflowEvent.ts         # ✨ NEW - emission helper
│   │   │   │   └── createWorkflowEvent.ts       # ⚠️ UPDATE - add emit
│   │   │   ├── executions/
│   │   │   │   └── getWorkflowExecutions.ts     # ⚠️ REWRITE - optimize query
│   │   │   ├── artifacts/
│   │   │   │   ├── createWorkflowArtifact.ts    # ⚠️ UPDATE - add emit
│   │   │   │   └── attachArtifactToWorkflowEvent.ts # ⚠️ UPDATE - add emit
│   │   │   └── engine/
│   │   │       ├── createWorkflowRuntime.ts     # ⚠️ UPDATE - add emit
│   │   │       └── steps/
│   │   │           ├── executeStep.ts           # ⚠️ UPDATE - add emit
│   │   │           ├── updateStepStatus.ts      # ⚠️ UPDATE - add emit
│   │   │           ├── createAgentStep.ts       # ⚠️ UPDATE - add emit
│   │   │           ├── createCliStep.ts         # ⚠️ UPDATE - add emit
│   │   │           ├── createGitStep.ts         # ⚠️ UPDATE - add emit
│   │   │           ├── createRunStep.ts         # ⚠️ UPDATE - add emit
│   │   │           └── createAnnotationStep.ts  # ⚠️ UPDATE - add emit
│   │
│   └── client/pages/projects/workflows/
│       ├── stores/
│       │   └── workflowStore.ts        # ❌ DELETE - remove entirely
│       ├── types.ts                    # ⚠️ UPDATE - add list/detail interfaces
│       ├── hooks/
│       │   ├── useWorkflowWebSocket.ts # ⚠️ REWRITE - React Query integration
│       │   ├── useWorkflowExecutions.ts # ⚠️ UPDATE - remove store, update types
│       │   └── useWorkflowExecution.ts  # ⚠️ UPDATE - remove store, update types
│       ├── ProjectWorkflowsView.tsx     # ⚠️ UPDATE - remove store imports
│       ├── WorkflowDefinitionView.tsx   # ⚠️ UPDATE - remove store imports
│       └── WorkflowExecutionDetail.tsx  # ⚠️ UPDATE - remove store imports
```

### Integration Points

**WebSocket Server**:
- `server/websocket/` - Broadcast mechanism (existing)
- New `emitWorkflowEvent()` helper wraps emission

**React Query**:
- Query keys: `['workflow-executions', projectId]`, `['workflow-execution', executionId]`
- Optimistic updates via `setQueryData`
- Debounced invalidation for safety

**Database Layer**:
- No schema changes
- Only query optimization (select fewer fields)

## Implementation Details

### 1. Event Type Consolidation

**Current (12 events):**
```typescript
CREATED, STARTED, STEP_STARTED, STEP_COMPLETED, STEP_FAILED,
PHASE_COMPLETED, COMPLETED, FAILED, PAUSED, RESUMED,
CANCELLED, ANNOTATION_CREATED
```

**New (4 events):**
```typescript
workflow:execution:updated           // Status, phase, error changes
workflow:execution:step:updated      // Step status, logs, error changes
workflow:execution:event:created     // WorkflowEvent created (annotations, etc.)
workflow:execution:artifact:created  // WorkflowArtifact uploaded/attached
```

**Key Points**:
- Hierarchical namespace with colons (Socket.io convention)
- One event per database table (WorkflowExecution, WorkflowExecutionStep, WorkflowEvent, WorkflowArtifact)
- `changes` object contains only modified fields (partial update)
- All events include `execution_id` for filtering

### 2. React Query Optimistic Updates

Replace Zustand store with React Query cache manipulation:

**Pattern:**
```typescript
// Instant update (0ms)
queryClient.setQueryData(['workflow-execution', executionId], (old) => ({
  ...old,
  ...changes
}));

// Safety net (5s later, resets on new events)
debouncedInvalidate(['workflow-execution', executionId]);
```

**Key Points**:
- `setQueryData` is synchronous, triggers immediate re-render
- If query doesn't exist in cache, update is no-op (very efficient)
- Multiple views using same query key all update simultaneously
- Debounced invalidation provides background refetch from server

### 3. Query Optimization

**Current (over-fetching):**
```typescript
// Fetches ALL nested data (steps, events, artifacts)
// ~10KB per execution, 500KB for 50 executions
```

**New (minimal):**
```typescript
select: {
  id: true,
  name: true,
  status: true,
  current_phase: true,
  workflow_definition_id: true,
  started_at: true,
  created_at: true,
  workflow_definition: { select: { name: true, phases: true } },
  _count: { select: { steps: true } }
}
// ~500 bytes per execution, 25KB for 50 executions (95% reduction)
```

**Key Points**:
- List views don't need nested arrays
- Detail view still fetches full data (separate query)
- WebSocket keeps list view fresh without refetch

### 4. Project Room Broadcasting

**Server emits to ONE room:**
```typescript
io.to(`project:${projectId}`).emit('message', event);
```

**All clients in project receive ALL events:**
- List view receives updates for all executions → updates list
- Detail view receives updates for all executions → filters to current one
- Definition board receives updates for all executions → filters by definition_id

**Key Points**:
- Simpler than per-execution rooms
- Industry standard (Slack, Trello, GitHub, Figma)
- React Query cache efficiently ignores irrelevant updates
- All views auto-sync without additional logic

## Files to Create/Modify

### New Files (1)

1. `apps/web/src/server/domain/workflow/services/events/emitWorkflowEvent.ts` - Central WebSocket emission helper with type safety

### Modified Files (19)

**Type System (2):**
1. `apps/web/src/shared/types/websocket.types.ts` - Remove 12 old events, add 4 new hierarchical events
2. `apps/web/src/client/pages/projects/workflows/types.ts` - Add WorkflowExecutionListItem and WorkflowExecutionDetail interfaces

**Backend Query (1):**
3. `apps/web/src/server/domain/workflow/services/executions/getWorkflowExecutions.ts` - Optimize to select minimal fields

**Backend Emission (10):**
4. `apps/web/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts` - Emit execution:updated on start
5. `apps/web/src/server/domain/workflow/services/engine/steps/executeStep.ts` - Emit execution:updated on complete/fail
6. `apps/web/src/server/domain/workflow/services/engine/steps/updateStepStatus.ts` - Emit step:updated on status change
7. `apps/web/src/server/domain/workflow/services/engine/steps/createAgentStep.ts` - Emit step:updated on creation
8. `apps/web/src/server/domain/workflow/services/engine/steps/createCliStep.ts` - Emit step:updated on creation
9. `apps/web/src/server/domain/workflow/services/engine/steps/createGitStep.ts` - Emit step:updated on creation
10. `apps/web/src/server/domain/workflow/services/engine/steps/createRunStep.ts` - Emit step:updated on creation
11. `apps/web/src/server/domain/workflow/services/engine/steps/createAnnotationStep.ts` - Emit event:created on annotation
12. `apps/web/src/server/domain/workflow/services/events/createWorkflowEvent.ts` - Emit event:created
13. `apps/web/src/server/domain/workflow/services/artifacts/createWorkflowArtifact.ts` - Emit artifact:created
14. `apps/web/src/server/domain/workflow/services/artifacts/attachArtifactToWorkflowEvent.ts` - Emit artifact:created

**Frontend (6):**
15. `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts` - Complete rewrite with React Query
16. `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowExecutions.ts` - Remove store, update types
17. `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowExecution.ts` - Remove store, update types
18. `apps/web/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx` - Remove store imports
19. `apps/web/src/client/pages/projects/workflows/WorkflowDefinitionView.tsx` - Remove store imports
20. `apps/web/src/client/pages/projects/workflows/WorkflowExecutionDetail.tsx` - Remove store imports

### Deleted Files (1)

1. `apps/web/src/client/pages/projects/workflows/stores/workflowStore.ts` - Remove entire Zustand store (~200 lines)

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Type System Foundation

<!-- prettier-ignore -->
- [ ] 52-1 Rewrite WebSocket event types with 4 hierarchical events
  - File: `apps/web/src/shared/types/websocket.types.ts`
  - Remove old 12 event types and all related interfaces
  - Add discriminated union with 4 event types: `workflow:execution:updated`, `workflow:execution:step:updated`, `workflow:execution:event:created`, `workflow:execution:artifact:created`
  - Each event has `type` and `data` with proper TypeScript types
  - Use Partial<> for changes objects to allow incremental updates
- [ ] 52-2 Add frontend type interfaces for list and detail views
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`
  - Add `WorkflowExecutionListItem` interface (8 fields + _count)
  - Add `WorkflowExecutionDetail` interface (full nested data)
  - Use snake_case for all field names (match Prisma)
  - Export both interfaces

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Phase 2: Backend - WebSocket Emission Infrastructure

<!-- prettier-ignore -->
- [ ] 52-3 Create central WebSocket emission helper
  - File: `apps/web/src/server/domain/workflow/services/events/emitWorkflowEvent.ts`
  - Export `emitWorkflowEvent(projectId: string, event: WorkflowWebSocketEvent): void`
  - Get WebSocket server instance (adapt to your existing WS infrastructure)
  - Emit to `project:${projectId}` room only
  - Type-safe: accepts only WorkflowWebSocketEvent union type
- [ ] 52-4 Update execution runtime to emit execution:updated on start
  - File: `apps/web/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts`
  - Import `emitWorkflowEvent` helper
  - After execution starts (status → 'running'), emit event
  - Payload: `{ execution_id, project_id, changes: { status: 'running', started_at } }`
- [ ] 52-5 Update executeStep to emit execution:updated on completion
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/executeStep.ts`
  - After execution completes/fails, emit event
  - Payload: `{ execution_id, project_id, changes: { status, completed_at, error_message } }`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Phase 3: Backend - Step Update Emissions

<!-- prettier-ignore -->
- [ ] 52-6 Update updateStepStatus to emit step:updated
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/updateStepStatus.ts`
  - After step status update, emit event
  - Payload: `{ execution_id, step_id, changes: { status, completed_at?, error_message? } }`
- [ ] 52-7 Update createAgentStep to emit step:updated on creation
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`
  - After step created, emit event
  - Payload: `{ execution_id, step_id, changes: { status: 'pending', created_at } }`
- [ ] 52-8 Update createCliStep to emit step:updated on creation
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createCliStep.ts`
  - After step created, emit event
- [ ] 52-9 Update createGitStep to emit step:updated on creation
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createGitStep.ts`
  - After step created, emit event
- [ ] 52-10 Update createRunStep to emit step:updated on creation
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createRunStep.ts`
  - After step created, emit event

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Phase 4: Backend - Event & Artifact Emissions

<!-- prettier-ignore -->
- [ ] 52-11 Update createWorkflowEvent to emit event:created
  - File: `apps/web/src/server/domain/workflow/services/events/createWorkflowEvent.ts`
  - After event created in DB, emit WebSocket event
  - Payload: `{ execution_id, event: <full WorkflowEvent object> }`
- [ ] 52-12 Update createAnnotationStep to emit event:created
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createAnnotationStep.ts`
  - When annotation created, emit event (might already call createWorkflowEvent)
- [ ] 52-13 Update createWorkflowArtifact to emit artifact:created
  - File: `apps/web/src/server/domain/workflow/services/artifacts/createWorkflowArtifact.ts`
  - After artifact uploaded/created, emit event
  - Payload: `{ execution_id, artifact: <full WorkflowArtifact object> }`
- [ ] 52-14 Update attachArtifactToWorkflowEvent to emit artifact:created
  - File: `apps/web/src/server/domain/workflow/services/artifacts/attachArtifactToWorkflowEvent.ts`
  - After artifact attached to event, emit event

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Phase 5: Backend - Query Optimization

<!-- prettier-ignore -->
- [ ] 52-15 Optimize getWorkflowExecutions query for list views
  - File: `apps/web/src/server/domain/workflow/services/executions/getWorkflowExecutions.ts`
  - Change from `include` to `select` for precise field control
  - Select only: id, name, status, current_phase, workflow_definition_id, started_at, created_at
  - Include: `workflow_definition: { select: { name: true, phases: true } }`
  - Include: `_count: { select: { steps: true } }`
  - Remove: steps array, events array, artifacts array
  - Test query returns correct shape

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Phase 6: Frontend - Remove Zustand Store

<!-- prettier-ignore -->
- [ ] 52-16 Delete workflowStore entirely
  - File: `apps/web/src/client/pages/projects/workflows/stores/workflowStore.ts`
  - Delete file completely (~200 lines)
  - Verify no remaining imports (use grep/search)

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Phase 7: Frontend - React Query Integration

<!-- prettier-ignore -->
- [ ] 52-17 Rewrite useWorkflowWebSocket with React Query
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
  - Remove all Zustand imports
  - Import `useQueryClient` from @tanstack/react-query
  - Implement 4 event handlers: handleExecutionUpdated, handleStepUpdated, handleEventCreated, handleArtifactCreated
  - Each handler calls `queryClient.setQueryData()` for optimistic update
  - Each handler calls debounced `invalidateQueries()` 5s later
  - Main onmessage switch on event.type
  - Connect to WebSocket with projectId in URL/query
- [ ] 52-18 Add debounce utility or import from lodash
  - If not already available, add debounce function
  - Used for 5s delayed invalidation
- [ ] 52-19 Update useWorkflowExecutions hook types
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowExecutions.ts`
  - Remove any workflowStore imports/usage
  - Type return as `WorkflowExecutionListItem[]`
  - Already uses React Query, just update types
- [ ] 52-20 Update useWorkflowExecution hook types
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowExecution.ts`
  - Remove any workflowStore imports/usage
  - Type return as `WorkflowExecutionDetail`
  - Already uses React Query, just update types

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Phase 8: Frontend - View Component Updates

<!-- prettier-ignore -->
- [ ] 52-21 Remove workflowStore from ProjectWorkflowsView
  - File: `apps/web/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx`
  - Remove workflowStore imports
  - Keep `useWorkflowWebSocket(projectId)` call (sets up listener)
  - Use query data directly from `useWorkflowExecutions`
  - Grouping by status already done client-side
- [ ] 52-22 Remove workflowStore from WorkflowDefinitionView
  - File: `apps/web/src/client/pages/projects/workflows/WorkflowDefinitionView.tsx`
  - Remove workflowStore imports
  - Keep `useWorkflowWebSocket(projectId)` call
  - Use query data directly from `useWorkflowExecutions`
  - Grouping by phase already done client-side
- [ ] 52-23 Remove workflowStore from WorkflowExecutionDetail
  - File: `apps/web/src/client/pages/projects/workflows/WorkflowExecutionDetail.tsx`
  - Remove workflowStore imports
  - Already uses React Query for data
  - Phase cards automatically update via cache changes

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Phase 9: Verification & Testing

<!-- prettier-ignore -->
- [ ] 52-24 Run type checking across entire codebase
  - Command: `cd apps/web && pnpm check-types`
  - Expected: No TypeScript errors
  - Fix any type errors related to event changes
- [ ] 52-25 Run linting
  - Command: `cd apps/web && pnpm lint`
  - Expected: No lint errors
  - Fix any unused imports from store removal
- [ ] 52-26 Build application
  - Command: `cd apps/web && pnpm build`
  - Expected: Successful build
- [ ] 52-27 Manual test: Create workflow execution
  - Start dev server: `pnpm dev`
  - Navigate to workflows page
  - Create new execution
  - Verify: Appears in list immediately
  - Verify: WebSocket event received in browser DevTools > Network > WS
- [ ] 52-28 Manual test: Execution status changes
  - Start execution
  - Verify: Moves to "running" column instantly
  - Verify: WebSocket event shows `workflow:execution:updated`
  - Complete execution
  - Verify: Moves to "completed" column instantly
- [ ] 52-29 Manual test: Detail view real-time updates
  - Open execution detail
  - Trigger step updates (via backend or another browser tab)
  - Verify: Steps update status instantly
  - Verify: Phase cards update in real-time
  - Verify: Events appear in timeline
- [ ] 52-30 Manual test: Cross-view synchronization
  - Open list view in one tab
  - Open detail view in another tab
  - Make changes (trigger execution updates)
  - Verify: Both tabs update simultaneously
  - Verify: No stale data, no flickering
- [ ] 52-31 Manual test: Background refetch
  - Open execution detail
  - Wait 5 seconds after last event
  - Verify: Browser DevTools > Network shows refetch query
  - Verify: Data stays consistent
- [ ] 52-32 Check browser console for errors
  - Verify: No errors or warnings
  - Verify: No Zustand store references (should be removed)

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

No new unit tests required for this refactor. Existing tests for domain services should continue to pass. If emit logic needs testing:

**`emitWorkflowEvent.test.ts`** - Test WebSocket emission helper:
```typescript
describe('emitWorkflowEvent', () => {
  it('should emit to project room', () => {
    const mockIo = createMockWebSocketServer();
    emitWorkflowEvent('project-123', {
      type: 'workflow:execution:updated',
      data: { execution_id: 'exec-1', project_id: 'project-123', changes: {} }
    });
    expect(mockIo.to).toHaveBeenCalledWith('project:project-123');
  });
});
```

### Integration Tests

Test WebSocket flow end-to-end:
1. Create execution via API
2. Verify WebSocket event emitted
3. Verify event has correct structure
4. Verify frontend receives event (if testing with browser)

### E2E Tests

**`workflow-real-time-updates.test.ts`** - Test real-time UI updates:
```typescript
test('execution status updates appear instantly', async ({ page }) => {
  // Navigate to workflows page
  await page.goto('/projects/test-project/workflows');

  // Create execution
  await page.click('button:has-text("New Workflow")');
  // ... fill form, submit

  // Verify appears in list
  await expect(page.locator('[data-testid="execution-card"]')).toBeVisible();

  // Start execution (trigger via API or UI)
  await startExecution(executionId);

  // Verify moves to "running" column instantly (< 500ms)
  await expect(page.locator('.kanban-column-running').locator('[data-testid="execution-card"]')).toBeVisible({ timeout: 500 });
});
```

## Success Criteria

- [ ] All 12 old event types removed from codebase
- [ ] 4 new hierarchical event types implemented and emitting correctly
- [ ] Zustand workflowStore deleted (~200 lines removed)
- [ ] React Query cache is single source of truth for server state
- [ ] List queries fetch 60% less data (8 fields vs full nested objects)
- [ ] UI updates appear instantly (< 100ms after WebSocket event)
- [ ] Background refetch triggers 5s after last event
- [ ] All views (list, definition board, detail) update simultaneously
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Application builds successfully
- [ ] Manual testing confirms all real-time features work
- [ ] Browser console has no errors or warnings
- [ ] WebSocket events visible in browser DevTools > Network > WS tab

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web
pnpm check-types
# Expected: No TypeScript errors

# Linting
pnpm lint
# Expected: No lint errors, no unused imports

# Build verification
pnpm build
# Expected: Successful build for both client and server
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}/workflows`
3. Open browser DevTools > Network > WS tab
4. Create new workflow execution
5. Verify WebSocket event received: `workflow:execution:updated` with correct structure
6. Start execution
7. Verify UI updates instantly (< 100ms)
8. Verify WebSocket event: `workflow:execution:updated` with status change
9. Open execution detail in new tab
10. Verify both tabs update simultaneously
11. Check console: No errors or warnings

**Feature-Specific Checks:**

- **Event structure validation**: Check WebSocket messages in DevTools, verify structure matches TypeScript types
- **Optimistic updates**: UI should update instantly before server responds
- **Background refetch**: Wait 5s after event, verify refetch query in Network tab
- **Query optimization**: Compare network payload size before/after (should be ~60% smaller for list queries)
- **Cross-view sync**: Multiple browser tabs should all update simultaneously
- **No Zustand references**: Search codebase for `workflowStore`, should find 0 results

**WebSocket Event Validation:**

```bash
# In browser DevTools > Console, monitor WebSocket messages
# Should see events like:
{
  "type": "workflow:execution:updated",
  "data": {
    "execution_id": "...",
    "project_id": "...",
    "changes": { "status": "running", "started_at": "..." }
  }
}

# Verify all 4 event types emit during workflow execution:
# 1. workflow:execution:updated (on start/complete)
# 2. workflow:execution:step:updated (on each step)
# 3. workflow:execution:event:created (on annotations/phase complete)
# 4. workflow:execution:artifact:created (if artifacts uploaded)
```

## Implementation Notes

### 1. WebSocket Server Integration

The `emitWorkflowEvent` helper needs to integrate with your existing WebSocket server infrastructure. Adapt the implementation to match how you currently emit events (e.g., Fastify WebSocket, Socket.io, native WebSocket).

### 2. Debounce Implementation

Use lodash debounce or implement custom:
```typescript
const debounce = (fn: Function, delay: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};
```

### 3. React Query Cache Keys

Query keys must be consistent:
- List: `['workflow-executions', projectId, filters?]`
- Detail: `['workflow-execution', executionId]`

Use `setQueriesData` with partial key matching to update all list queries.

### 4. Partial Updates Pattern

The `changes` object in events contains only modified fields. Spread into existing object:
```typescript
{ ...old, ...changes }
```

For nested updates (e.g., steps array), use map:
```typescript
{
  ...old,
  steps: old.steps.map(s => s.id === stepId ? { ...s, ...changes } : s)
}
```

### 5. Testing WebSocket Locally

Use browser DevTools > Network > WS to monitor messages. Look for:
- Connection established to `ws://localhost:3456/ws`
- Messages with correct event types
- Payload structure matches TypeScript types

### 6. Migration Safety

This is a full refactor with no backward compatibility. Deploy as atomic change:
1. Deploy backend changes (new events start emitting)
2. Deploy frontend changes (consumes new events)
3. Old event handlers removed, clients must refresh

Consider feature flag if gradual rollout needed.

## Dependencies

- `@tanstack/react-query` - Already installed
- `lodash` or custom debounce - For debounced invalidation
- No new dependencies required

## Timeline

| Task                              | Estimated Time |
| --------------------------------- | -------------- |
| Phase 1: Type System              | 1 hour         |
| Phase 2: Emission Infrastructure  | 1 hour         |
| Phase 3: Step Emissions           | 1 hour         |
| Phase 4: Event & Artifact         | 0.5 hours      |
| Phase 5: Query Optimization       | 0.5 hours      |
| Phase 6: Remove Store             | 0.5 hours      |
| Phase 7: React Query Integration  | 2 hours        |
| Phase 8: View Updates             | 0.5 hours      |
| Phase 9: Testing & Verification   | 1 hour         |
| **Total**                         | **8 hours**    |

## References

- React Query Optimistic Updates: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates
- Socket.io Event Naming: https://socket.io/docs/v4/emit-cheatsheet/
- Industry Patterns: Slack/Trello/GitHub WebSocket architecture (project room broadcasting)
- Previous Related Spec: `.agent/specs/done/44-workflow-event-format-refactor-spec.md`

## Next Steps

1. Review this spec for completeness
2. Run `/implement-spec 52` to begin implementation
3. Execute tasks sequentially from top to bottom
4. Fill in "Completion Notes" after each phase
5. Verify all success criteria before marking complete
