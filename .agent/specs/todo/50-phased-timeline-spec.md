# Phase-Grouped Timeline Display

**Status**: draft
**Created**: 2025-01-04
**Package**: apps/web
**Estimated Effort**: 4-6 hours

## Overview

Redesign workflow execution timeline to group steps, events, and artifacts by phase instead of showing a flat chronological list. This improves readability and aligns the UI with the workflow engine's phase-based execution model.

## User Story

As a user viewing workflow execution history
I want to see timeline items organized by phase
So that I can understand the phase structure and quickly navigate to specific phases

## Technical Approach

Keep `buildTimelineModel` unchanged (returns flat timeline). Add a new `groupTimelineByPhase` utility that transforms the flat timeline into phase-grouped structure. Create collapsible `PhaseCard` components to render each phase with its nested items. Update `WorkflowTimeline` to use the phase-grouped model.

## Key Design Decisions

1. **Separation of Concerns**: Keep data transformation (`buildTimelineModel`) separate from view transformation (`groupTimelineByPhase`) for maintainability and testability
2. **Collapsible Phase Cards**: Auto-expand currently running phase, user controls other phases
3. **Add phase to artifacts**: Store phase field in `WorkflowArtifact` table to enable complete phase grouping
4. **Workflow events outside phases**: Render workflow-level events (workflow_started, workflow_completed) outside phase cards at timeline top/bottom
5. **Phase metadata in card header/footer**: Show phase start/completion time and retry count without cluttering content

## Architecture

### File Structure
```
apps/web/
├── prisma/
│   ├── schema.prisma                    # Add phase to WorkflowArtifact
│   └── migrations/                      # New migration
├── src/
│   ├── server/domain/workflow/
│   │   └── services/engine/steps/
│   │       └── createArtifactStep.ts    # Store context.currentPhase
│   └── client/pages/projects/workflows/
│       ├── utils/
│       │   ├── buildTimelineModel.ts    # Unchanged
│       │   └── groupTimelineByPhase.ts  # New
│       └── components/
│           ├── WorkflowTimeline.tsx     # Updated
│           └── timeline/
│               ├── StepItem.tsx         # Remove phase metadata
│               └── PhaseCard.tsx        # New
```

### Integration Points

**Database (Prisma)**:
- `prisma/schema.prisma` - Add `phase String?` to `WorkflowArtifact` model
- `prisma/migrations/` - Generate migration

**Backend**:
- `apps/web/src/server/domain/workflow/services/engine/steps/createArtifactStep.ts` - Store `context.currentPhase` when creating artifacts

**Frontend**:
- `apps/web/src/client/pages/projects/workflows/utils/groupTimelineByPhase.ts` - New utility for phase grouping
- `apps/web/src/client/pages/projects/workflows/components/timeline/PhaseCard.tsx` - New collapsible phase card component
- `apps/web/src/client/pages/projects/workflows/components/WorkflowTimeline.tsx` - Use phase-grouped model
- `apps/web/src/client/pages/projects/workflows/components/timeline/StepItem.tsx` - Remove phase metadata display

## Implementation Details

### 1. Database Schema Update

Add `phase` field to `WorkflowArtifact` model to enable complete phase grouping.

**Key Points**:
- Field is optional (`String?`) since existing artifacts won't have phase
- New artifacts will automatically capture phase from execution context
- No backfill needed for existing data

### 2. Backend Artifact Creation

Update `createArtifactStep.ts` to store the current phase when creating artifacts.

**Key Points**:
- Access `context.currentPhase` from runtime context
- Store in artifact record during creation
- No changes to artifact API or queries needed

### 3. Frontend Phase Grouping Utility

Create `groupTimelineByPhase.ts` that transforms flat `TimelineModel` into phase-grouped structure.

**Key Points**:
- Input: `TimelineModel` (from `buildTimelineModel`)
- Output: `PhaseGroupedTimeline` with workflow events and phase groups
- Extract workflow-level events (scope === 'workflow')
- Group steps/events/annotations by `phase` field
- Extract phase metadata (started/completed time, retry count) from phase events
- Only include started phases (skip pending phases)
- Preserve chronological order within each phase
- Calculate phase status from child step statuses

### 4. PhaseCard Component

Create collapsible card component for rendering a phase and its nested items.

**Key Points**:
- Collapsible with local state (no persistence)
- Auto-expand if `metadata.status === 'running'`
- Header: phase name, status badge, duration, chevron toggle icon
- Footer: completion timestamp, retry count (if > 0)
- Active phase: `border-l-4 border-blue-500`
- Phase status colors: running (blue), completed (green), failed (red)
- Renders nested items using existing `StepItem`, `EventItem`, `EventAnnotationItem`
- Smooth expand/collapse animation

### 5. WorkflowTimeline Update

Update timeline component to use phase-grouped model and render phase cards.

**Key Points**:
- Pipeline: `buildTimelineModel()` → `groupTimelineByPhase()` → render
- Render workflow events at top and bottom (outside phase cards)
- Map phases to `PhaseCard` components
- Auto-scroll to active phase on mount (`useEffect` + `scrollIntoView`)
- Empty state if no phases to display

### 6. StepItem Update

Remove phase metadata from step header since it's now redundant in phase card context.

**Key Points**:
- Remove `step.phase` line from metadata display (lines 73-78)
- Keep: step name, duration, status badge, expandable sections
- All other functionality unchanged

## Files to Create/Modify

### New Files (2)

1. `apps/web/src/client/pages/projects/workflows/utils/groupTimelineByPhase.ts` - Phase grouping utility
2. `apps/web/src/client/pages/projects/workflows/components/timeline/PhaseCard.tsx` - Phase card component

### Modified Files (5)

1. `apps/web/prisma/schema.prisma` - Add `phase String?` to `WorkflowArtifact`
2. `apps/web/prisma/migrations/*/migration.sql` - Migration file (generated)
3. `apps/web/src/server/domain/workflow/services/engine/steps/createArtifactStep.ts` - Store phase in artifacts
4. `apps/web/src/client/pages/projects/workflows/components/WorkflowTimeline.tsx` - Use phase grouping
5. `apps/web/src/client/pages/projects/workflows/components/timeline/StepItem.tsx` - Remove phase metadata

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Database Schema Changes

<!-- prettier-ignore -->
- [ ] db-schema-update Add `phase String?` field to `WorkflowArtifact` model
  - File: `apps/web/prisma/schema.prisma`
  - Add field after existing fields: `phase String?`
- [ ] db-migration-generate Generate Prisma migration
  - Run: `cd apps/web && pnpm prisma migrate dev --name add_phase_to_artifacts`
  - Verify migration file created in `prisma/migrations/`
- [ ] db-migration-apply Apply migration to development database
  - Run: `cd apps/web && pnpm prisma migrate deploy`
  - Verify no errors in output

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: Backend Artifact Creation Update

<!-- prettier-ignore -->
- [ ] artifact-phase-storage Update artifact creation to store phase
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createArtifactStep.ts`
  - In artifact creation logic, add: `phase: context.currentPhase`
  - Ensure `context.currentPhase` is passed to Prisma create call
- [ ] artifact-phase-test Verify artifact phase storage
  - Create test workflow with artifacts in multiple phases
  - Check database to confirm `phase` field is populated
  - Query: `SELECT id, name, phase FROM WorkflowArtifact LIMIT 10;`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 3: Frontend Phase Grouping Utility

<!-- prettier-ignore -->
- [ ] phase-types Define phase grouping types
  - File: `apps/web/src/client/pages/projects/workflows/utils/groupTimelineByPhase.ts`
  - Create types: `PhaseGroup`, `PhaseGroupedTimeline`
  - Include: name, items[], metadata (startedAt, completedAt, retryCount, status)
- [ ] phase-grouping-logic Implement groupTimelineByPhase function
  - File: `apps/web/src/client/pages/projects/workflows/utils/groupTimelineByPhase.ts`
  - Input: `TimelineModel`
  - Separate workflow events (scope === 'workflow')
  - Group steps/events/annotations by phase field
  - Extract phase metadata from phase events
  - Calculate phase status from child steps
  - Return `PhaseGroupedTimeline`
- [ ] phase-grouping-test Test phase grouping with mock data
  - Create test data with multiple phases
  - Verify correct grouping and metadata extraction
  - Test edge cases: empty phases, single phase, no phases

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 4: PhaseCard Component

<!-- prettier-ignore -->
- [ ] phase-card-component Create PhaseCard component
  - File: `apps/web/src/client/pages/projects/workflows/components/timeline/PhaseCard.tsx`
  - Props: `phase: PhaseGroup`, `projectId: string`
  - Local state: `isExpanded` (default based on status)
  - Render header: phase name, status badge, duration, chevron icon
  - Render footer: completion time, retry count (if > 0)
  - Render body: map phase.items to existing item components
- [ ] phase-card-styles Add phase card styling
  - File: `apps/web/src/client/pages/projects/workflows/components/timeline/PhaseCard.tsx`
  - Active phase: `border-l-4 border-blue-500`
  - Status colors: running (blue), completed (green), failed (red), pending (gray)
  - Smooth expand/collapse transition: `transition-all duration-200`
  - Collapsible body with overflow hidden
- [ ] phase-card-interactions Add click handlers and auto-expand
  - Auto-expand if `metadata.status === 'running'`
  - Toggle expand on header click
  - Chevron icon rotation on expand/collapse

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 5: WorkflowTimeline Update

<!-- prettier-ignore -->
- [ ] timeline-integration Integrate phase grouping into WorkflowTimeline
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimeline.tsx`
  - Import `groupTimelineByPhase` utility
  - Call: `const grouped = useMemo(() => groupTimelineByPhase(model), [model])`
  - Render workflow events at top (before phases)
  - Map `grouped.phases` to `PhaseCard` components
  - Render workflow events at bottom (after phases)
- [ ] timeline-auto-scroll Add auto-scroll to active phase
  - Use `useEffect` to scroll on mount
  - Find active phase (status === 'running')
  - Call `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- [ ] timeline-empty-state Handle empty timeline state
  - Show message if `grouped.phases.length === 0`
  - Message: "No workflow execution history to display"

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 6: StepItem Cleanup

<!-- prettier-ignore -->
- [ ] step-item-cleanup Remove phase metadata from StepItem
  - File: `apps/web/src/client/pages/projects/workflows/components/timeline/StepItem.tsx`
  - Remove lines 73-78 (phase metadata display)
  - Keep: step name, duration, status badge
  - Verify all other functionality unchanged

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

**`groupTimelineByPhase.test.ts`** - Test phase grouping logic:

```typescript
describe('groupTimelineByPhase', () => {
  it('groups items by phase', () => {
    const model = createMockTimelineModel([
      { phase: 'research', ... },
      { phase: 'research', ... },
      { phase: 'implement', ... }
    ]);

    const grouped = groupTimelineByPhase(model);

    expect(grouped.phases).toHaveLength(2);
    expect(grouped.phases[0].name).toBe('research');
    expect(grouped.phases[0].items).toHaveLength(2);
    expect(grouped.phases[1].name).toBe('implement');
    expect(grouped.phases[1].items).toHaveLength(1);
  });

  it('extracts workflow-level events', () => {
    const model = createMockTimelineModel([
      { itemType: 'event', metadata: { scope: 'workflow' }, ... },
      { itemType: 'step', phase: 'research', ... }
    ]);

    const grouped = groupTimelineByPhase(model);

    expect(grouped.workflowEvents).toHaveLength(1);
    expect(grouped.phases[0].items).toHaveLength(1);
  });

  it('calculates phase status from steps', () => {
    const model = createMockTimelineModel([
      { phase: 'research', status: 'completed', ... },
      { phase: 'research', status: 'failed', ... }
    ]);

    const grouped = groupTimelineByPhase(model);

    expect(grouped.phases[0].metadata.status).toBe('failed');
  });

  it('only includes started phases', () => {
    const model = createMockTimelineModel([]);

    const grouped = groupTimelineByPhase(model);

    expect(grouped.phases).toHaveLength(0);
  });
});
```

### Integration Tests

Manual testing of phase-grouped timeline:
1. Create workflow execution with multiple phases
2. Verify phases render as collapsible cards
3. Check phase metadata (start time, duration, retry count)
4. Verify active phase auto-expands and has highlight border
5. Test expand/collapse interaction
6. Verify workflow events appear outside phase cards
7. Check that steps within phases render correctly
8. Test with single phase, multiple phases, and no phases

### E2E Tests (if applicable)

Not applicable for this feature (UI-only change, no new user flows)

## Success Criteria

- [ ] Timeline displays phases as collapsible cards
- [ ] Each phase shows: name, status badge, duration in header
- [ ] Phase footer shows completion time and retry count
- [ ] Active phase auto-expands and has highlighted border
- [ ] User can expand/collapse phases by clicking header
- [ ] Steps within phase render correctly (no duplicate phase metadata)
- [ ] Workflow events appear outside phase cards
- [ ] Artifacts include phase field in database
- [ ] New artifacts automatically capture phase from execution context
- [ ] Empty timeline shows appropriate message
- [ ] Phase grouping handles edge cases (single phase, no phases)
- [ ] Auto-scroll to active phase on page load
- [ ] Type-safe discriminated unions for timeline items
- [ ] No TypeScript errors
- [ ] No console warnings or errors

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

# Database migration status
cd apps/web && pnpm prisma migrate status
# Expected: All migrations applied
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: Workflow execution detail page
3. Verify: Timeline shows phase cards instead of flat list
4. Test phase interaction:
   - Click phase header to expand/collapse
   - Verify active phase is auto-expanded with highlight border
   - Check phase metadata in header/footer
5. Check step rendering:
   - Verify steps render within phase cards
   - Confirm no duplicate phase metadata in step items
6. Check workflow events:
   - Verify workflow_started appears at top
   - Verify workflow_completed appears at bottom
7. Test edge cases:
   - View workflow with single phase
   - View workflow with no completed phases
   - View workflow with failed phase
8. Check database:
   - Open Prisma Studio: `pnpm prisma:studio`
   - Verify `WorkflowArtifact` table has `phase` column
   - Verify new artifacts have phase populated
9. Check console: No errors or warnings

**Feature-Specific Checks:**

- Phase cards display in chronological order (by phase start time)
- Phase status accurately reflects child step statuses
- Retry count displays correctly for retried phases
- Duration calculation accurate (completedAt - startedAt)
- Empty state shows when no phases to display
- Auto-scroll positions active phase at top of viewport
- Expand/collapse animation smooth and performant

## Implementation Notes

### 1. Phase Status Calculation

Phase status derived from child steps using this priority:
1. If any step failed → phase status = 'failed'
2. If all steps completed → phase status = 'completed'
3. If any step running or phase is current → phase status = 'running'
4. Otherwise → phase status = 'pending'

### 2. Phase Metadata Extraction

Phase metadata extracted from phase lifecycle events:
- `startedAt`: timestamp from `phase_started` event
- `completedAt`: timestamp from `phase_completed` event
- `retryCount`: count of `phase_retry` events for this phase
- Handle missing events gracefully (default to null/0)

### 3. Performance Considerations

- `groupTimelineByPhase` wrapped in `useMemo` to avoid re-computing on every render
- PhaseCard uses local state (not Zustand) to minimize re-renders
- Expand/collapse animation uses CSS transitions (GPU-accelerated)
- Timeline items already memoized in existing components

### 4. Backward Compatibility

- Existing artifacts without `phase` field handled gracefully
- `buildTimelineModel` unchanged, maintains existing behavior
- Phase grouping is purely additive (no breaking changes)

## Dependencies

- No new dependencies required
- Uses existing Prisma, React, Tailwind, Lucide icons

## Timeline

| Task | Estimated Time |
| --- | --- |
| Database schema + migration | 0.5 hours |
| Backend artifact updates | 0.5 hours |
| Phase grouping utility | 1.5 hours |
| PhaseCard component | 1.5 hours |
| WorkflowTimeline integration | 1 hour |
| StepItem cleanup | 0.25 hours |
| Testing + bug fixes | 0.75 hours |
| **Total** | **4-6 hours** |

## References

- [Tool Result Matching Pattern](.agent/docs/claude-tool-result-patterns.md)
- [Testing Best Practices](.agent/docs/testing-best-practices.md)
- [Domain-Driven Architecture](apps/web/CLAUDE.md#backend-architecture)
- [Frontend Organization](apps/web/CLAUDE.md#frontend-file-organization)

## Next Steps

1. Run `/implement-spec 50` to begin implementation
2. Start with database schema changes (Task Group 1)
3. Proceed sequentially through task groups
4. Test thoroughly after each group
5. Verify all success criteria met
6. Create commit with descriptive message
