# Migrate Comments to Consolidated WorkflowEvent System

**Status**: draft
**Created**: 2025-01-03
**Package**: apps/web
**Estimated Effort**: 6-8 hours

## Overview

Transform the workflow execution display into a chronological timeline by consolidating the separate `WorkflowComment` table into a unified `WorkflowEvent` table. This creates a single audit log for all workflow activities (comments, system events, phase transitions, and future command execution), displayed in chronological order with expandable step details.

## User Story

As a workflow user
I want to see a chronological history of everything that happened during workflow execution (steps, comments, pauses, phase transitions)
So that I can understand the sequence of events and debug issues more effectively

## Technical Approach

Replace the separate `WorkflowComment` table with a consolidated `WorkflowEvent` table that stores all temporal workflow activities. The timeline UI merges events from `WorkflowEvent` (comments, system events, phases) with step data from `WorkflowExecutionStep` to create a unified chronological view. This approach uses events only for activities without dedicated tables (comments, system state changes, phases), while steps remain in their own table as the source of truth.

## Key Design Decisions

1. **Consolidate Comments into Events**: Comments become events with `event_type='comment_added'` and text stored in `event_data` JSON field. This eliminates duplication between tracking comments and other workflow activities.

2. **Events for State Changes Only**: Only create events for activities that don't have dedicated tables (comments, workflow state changes, phase transitions, future commands). Steps remain in `WorkflowExecutionStep` as source of truth.

3. **Dual-Write Migration Strategy**: Keep existing timestamp fields (`paused_at`, `cancelled_at`, etc.) alongside new events for backward compatibility. Timestamps remain source of truth for state; events are for historical display only.

4. **Log Step Events on Start**: Create `step_started` events when steps begin (using `step.started_at` timestamp) for real-time timeline visibility. Step completion data lives in the step record itself.

5. **Show Phase Transitions Explicitly**: Create `phase_started` and `phase_completed` events from MockWorkflowOrchestrator to make workflow structure visible in timeline.

## Architecture

### File Structure
```
apps/web/
├── prisma/
│   ├── schema.prisma                          # MODIFIED: Replace WorkflowComment with WorkflowEvent
│   ├── migrations/
│   │   └── YYYYMMDDHHMMSS_consolidate_events/ # NEW: Migration files
│   └── seed-workflows.ts                       # MODIFIED: Update to use events
│
├── src/
│   ├── server/
│   │   ├── domain/
│   │   │   └── workflow/
│   │   │       ├── services/
│   │   │       │   ├── createWorkflowEvent.ts           # NEW: Event creation helper
│   │   │       │   ├── getWorkflowExecutionById.ts      # MODIFIED: Fetch events
│   │   │       │   ├── MockWorkflowOrchestrator.ts      # MODIFIED: Log events
│   │   │       │   ├── pauseWorkflow.ts                 # MODIFIED: Log pause event
│   │   │       │   ├── resumeWorkflow.ts                # MODIFIED: Log resume event
│   │   │       │   ├── cancelWorkflow.ts                # MODIFIED: Log cancel event
│   │   │       │   └── index.ts                         # MODIFIED: Export new service
│   │   │       └── types/
│   │   │           └── index.ts                         # MODIFIED: Add event types
│   │   └── routes/
│   │       └── workflows.ts                             # MODIFIED: Update schemas
│   │
│   └── client/
│       └── pages/
│           └── projects/
│               └── workflows/
│                   ├── types.ts                          # MODIFIED: Add event types, remove comments
│                   ├── utils/
│                   │   └── buildTimeline.ts             # NEW: Timeline builder utility
│                   ├── components/
│                   │   ├── WorkflowTimeline.tsx         # NEW: Timeline container
│                   │   ├── WorkflowTimelineStepItem.tsx # NEW: Step timeline item
│                   │   ├── WorkflowTimelineEventItem.tsx # NEW: Event timeline item
│                   │   ├── WorkflowExecutionComments.tsx # DELETE: Replaced by events
│                   │   └── WorkflowExecutionStepsList.tsx # DELETE: Replaced by timeline
│                   ├── WorkflowExecutionDetail.tsx      # MODIFIED: Use timeline
│                   └── hooks/
│                       └── useWorkflowDefinition.ts     # MODIFIED: Handle events
```

### Integration Points

**Database (Prisma)**:
- `schema.prisma` - Replace `WorkflowComment` model with `WorkflowEvent` model
- Migration script - Convert existing comments to events, update artifact relations

**Backend Services**:
- `createWorkflowEvent.ts` - New service for consistent event creation
- `MockWorkflowOrchestrator.ts` - Log workflow/step/phase events
- Workflow control services - Log pause/resume/cancel events
- `getWorkflowExecutionById.ts` - Fetch and return events

**Frontend Components**:
- `WorkflowExecutionDetail.tsx` - Replace steps list + comments with unified timeline
- New timeline components - Display chronological event stream
- Delete old comment components - No longer needed

## Implementation Details

### 1. Database Schema Changes

Replace `WorkflowComment` table with `WorkflowEvent` table that supports all event types (comments, system events, phase transitions, future commands).

**Key Points**:
- `event_type` string field supports extensibility (no enum)
- `event_data` JSON field stores event-specific metadata
- `workflow_execution_step_id` nullable for step-related events
- `created_by_user_id` nullable for user-generated events
- Artifacts relation moves from comments to events
- Existing timestamps on `WorkflowExecution` remain unchanged (dual-write)

### 2. Event Logging Service

Create centralized service for consistent event creation across all workflow operations.

**Key Points**:
- Single function signature with optional parameters
- Handles Prisma create with relations
- Returns created event for immediate use
- Accepts logger parameter for debugging
- Type-safe event_data parameter based on event_type

### 3. MockWorkflowOrchestrator Event Integration

Update orchestrator to create events when emitting workflow lifecycle and phase transition events.

**Key Points**:
- Create `workflow_started` event on execution start
- Create `workflow_completed`/`workflow_failed` events on finish
- Create `phase_started` event when advancing to new phase
- Create `phase_completed` event when all phase steps done
- Create `step_started` event when step begins (for timeline visibility)
- Pass execution_id to event creation service

### 4. Timeline Data Builder

Create utility function to merge events and steps into chronological timeline structure.

**Key Points**:
- Merge `WorkflowEvent` records (comments, system events, phases) with `WorkflowExecutionStep` records
- Steps use `started_at` timestamp for timeline positioning
- Events use `created_at` timestamp
- Sort merged array by timestamp ascending
- Return discriminated union type `TimelineItem[]`
- Handle null/undefined timestamps gracefully
- Filter out workflow-level events from step-level display

### 5. Timeline UI Components

Build vertical timeline with visual connectors showing chronological flow of all workflow activities.

**Key Points**:
- `WorkflowTimeline` - Container with vertical line connector
- `WorkflowTimelineStepItem` - Expandable step cards (collapsed by default)
- `WorkflowTimelineEventItem` - System events, comments, phase transitions
- Use icons/badges to distinguish event types
- Show timestamps in consistent format
- Expandable step details: duration, logs, session link, error, step comments, artifacts
- Step comments render nested inside expanded step (filtered by `workflow_execution_step_id`)
- Workflow-level comments render as standalone timeline items

## Files to Create/Modify

### New Files (7)

1. `apps/web/prisma/migrations/YYYYMMDDHHMMSS_consolidate_events/migration.sql` - Database migration
2. `apps/web/src/server/domain/workflow/services/createWorkflowEvent.ts` - Event creation service
3. `apps/web/src/client/pages/projects/workflows/utils/buildTimeline.ts` - Timeline builder
4. `apps/web/src/client/pages/projects/workflows/components/WorkflowTimeline.tsx` - Timeline container
5. `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineStepItem.tsx` - Step timeline item
6. `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineEventItem.tsx` - Event timeline item
7. `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineCommentItem.tsx` - Comment rendering (used by EventItem)

### Modified Files (10)

1. `apps/web/prisma/schema.prisma` - Replace WorkflowComment with WorkflowEvent
2. `apps/web/src/server/domain/workflow/types/index.ts` - Add event types
3. `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts` - Create events
4. `apps/web/src/server/domain/workflow/services/pauseWorkflow.ts` - Create pause event
5. `apps/web/src/server/domain/workflow/services/resumeWorkflow.ts` - Create resume event
6. `apps/web/src/server/domain/workflow/services/cancelWorkflow.ts` - Create cancel event
7. `apps/web/src/server/domain/workflow/services/getWorkflowExecutionById.ts` - Fetch events
8. `apps/web/src/server/domain/workflow/services/index.ts` - Export new service
9. `apps/web/src/server/routes/workflows.ts` - Update response schemas
10. `apps/web/src/client/pages/projects/workflows/WorkflowExecutionDetail.tsx` - Use timeline
11. `apps/web/src/client/pages/projects/workflows/types.ts` - Add event types
12. `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowDefinition.ts` - Handle events

### Deleted Files (2)

1. `apps/web/src/client/pages/projects/workflows/components/WorkflowExecutionComments.tsx` - Replaced by timeline
2. `apps/web/src/client/pages/projects/workflows/components/WorkflowExecutionStepsList.tsx` - Replaced by timeline

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Database Schema Migration

<!-- prettier-ignore -->
- [ ] 1.1 Update Prisma schema to add WorkflowEvent model
  - Replace `WorkflowComment` model with `WorkflowEvent` model
  - Add fields: id, workflow_execution_id, event_type, event_data, workflow_execution_step_id, created_by_user_id, created_at
  - Add relations: workflow_execution, workflow_execution_step (nullable), created_by_user (nullable), artifacts
  - Add indexes: [workflow_execution_id, created_at], [event_type], [workflow_execution_step_id]
  - File: `apps/web/prisma/schema.prisma`

- [ ] 1.2 Update WorkflowExecution model relations
  - Remove `comments WorkflowComment[]` relation
  - Add `events WorkflowEvent[]` relation
  - File: `apps/web/prisma/schema.prisma`

- [ ] 1.3 Update WorkflowExecutionStep model relations
  - Remove `comments WorkflowComment[]` relation
  - Add `events WorkflowEvent[]` relation (for step-related events)
  - File: `apps/web/prisma/schema.prisma`

- [ ] 1.4 Update WorkflowArtifact model relations
  - Replace `workflow_comment_id` with `workflow_event_id`
  - Replace `comment WorkflowComment?` relation with `event WorkflowEvent?`
  - File: `apps/web/prisma/schema.prisma`

- [ ] 1.5 Create Prisma migration
  - Run: `cd apps/web && pnpm prisma:migrate`
  - Name migration: "consolidate_events"
  - Review generated SQL migration file
  - Expected: Creates workflow_events table, migrates workflow_comments data, drops workflow_comments table

- [ ] 1.6 Regenerate Prisma client
  - Run: `cd apps/web && pnpm prisma:generate`
  - Expected: New WorkflowEvent type available, WorkflowComment type removed

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: Backend - Event Types & Service

<!-- prettier-ignore -->
- [ ] 2.1 Add WorkflowEvent types to domain types
  - Define WorkflowEventType union type with all event types
  - Define EventDataMap interface for type-safe event_data
  - Export WorkflowEvent type from Prisma
  - File: `apps/web/src/server/domain/workflow/types/index.ts`

- [ ] 2.2 Create createWorkflowEvent service
  - Function signature: `createWorkflowEvent(params: CreateWorkflowEventParams): Promise<WorkflowEvent>`
  - Parameters: workflow_execution_id, event_type, event_data, workflow_execution_step_id?, created_by_user_id?, logger?
  - Use Prisma to create event with relations
  - Return created event
  - File: `apps/web/src/server/domain/workflow/services/createWorkflowEvent.ts`

- [ ] 2.3 Export createWorkflowEvent from services barrel
  - Add to exports in domain services index
  - File: `apps/web/src/server/domain/workflow/services/index.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 3: Backend - Event Logging Integration

<!-- prettier-ignore -->
- [ ] 3.1 Update MockWorkflowOrchestrator to log workflow events
  - Create `workflow_started` event when execution starts
  - Create `workflow_completed` event on successful completion
  - Create `workflow_failed` event on failure
  - Pass workflow_execution_id to createWorkflowEvent
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`

- [ ] 3.2 Update MockWorkflowOrchestrator to log phase events
  - Create `phase_started` event when advancing to new phase
  - Create `phase_completed` event when phase finishes (all steps done)
  - Store phase_name in event_data
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`

- [ ] 3.3 Update MockWorkflowOrchestrator to log step events
  - Create `step_started` event when step begins
  - Include step_id and step_name in event_data
  - Set workflow_execution_step_id relation
  - Use step.started_at as event created_at timestamp
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`

- [ ] 3.4 Update pauseWorkflow service to log pause event
  - Create `workflow_paused` event after setting paused_at timestamp
  - Include user_id in created_by_user_id if available
  - File: `apps/web/src/server/domain/workflow/services/pauseWorkflow.ts`

- [ ] 3.5 Update resumeWorkflow service to log resume event
  - Create `workflow_resumed` event after clearing paused_at
  - Include user_id in created_by_user_id if available
  - File: `apps/web/src/server/domain/workflow/services/resumeWorkflow.ts`

- [ ] 3.6 Update cancelWorkflow service to log cancel event
  - Create `workflow_cancelled` event after setting cancelled_at timestamp
  - Include user_id and reason (if provided) in event_data
  - File: `apps/web/src/server/domain/workflow/services/cancelWorkflow.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 4: Backend - Timeline Data Fetching

<!-- prettier-ignore -->
- [ ] 4.1 Update getWorkflowExecutionById to fetch events
  - Add Prisma query to fetch WorkflowEvent records for execution
  - Include relations: created_by_user, artifacts, workflow_execution_step
  - Order events by created_at ascending
  - File: `apps/web/src/server/domain/workflow/services/getWorkflowExecutionById.ts`

- [ ] 4.2 Update getWorkflowExecutionById return type
  - Replace comments array with events array in return type
  - Transform WorkflowEvent to frontend-friendly format if needed
  - File: `apps/web/src/server/domain/workflow/services/getWorkflowExecutionById.ts`

- [ ] 4.3 Update workflow routes response schema
  - Replace workflowCommentSchema with workflowEventSchema in Zod schema
  - Update response type for GET /api/workflows/:id/executions/:executionId
  - File: `apps/web/src/server/routes/workflows.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 5: Frontend - Timeline Types & Builder

<!-- prettier-ignore -->
- [ ] 5.1 Update frontend workflow types
  - Remove WorkflowComment type
  - Add WorkflowEvent type matching backend schema
  - Define WorkflowEventType enum/union
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`

- [ ] 5.2 Add TimelineItem discriminated union type
  - Define union: `{ type: 'step'; data: WorkflowExecutionStep }` | `{ type: 'event'; data: WorkflowEvent }`
  - Add timestamp field for sorting
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`

- [ ] 5.3 Create buildTimeline utility function
  - Function signature: `buildTimeline(steps: WorkflowExecutionStep[], events: WorkflowEvent[]): TimelineItem[]`
  - Map steps to timeline items using started_at timestamp
  - Map events to timeline items using created_at timestamp
  - Merge arrays and sort by timestamp ascending
  - Handle null/undefined timestamps (skip items with no timestamp)
  - File: `apps/web/src/client/pages/projects/workflows/utils/buildTimeline.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 6: Frontend - Timeline Components

<!-- prettier-ignore -->
- [ ] 6.1 Create WorkflowTimeline component
  - Props: `items: TimelineItem[]`
  - Render vertical timeline with visual line connector
  - Map over items and render StepItem or EventItem based on type
  - Use Tailwind for styling (dark mode support)
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimeline.tsx`

- [ ] 6.2 Create WorkflowTimelineStepItem component
  - Props: `step: WorkflowExecutionStep`, `stepEvents: WorkflowEvent[]` (comments for this step)
  - Collapsed view: step name, status badge, phase badge, started_at timestamp
  - Expandable (useState for collapsed state)
  - Expanded view: duration, completed_at, logs path, agent session link, error message
  - Render step-level comments inside expanded view
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineStepItem.tsx`

- [ ] 6.3 Create WorkflowTimelineEventItem component
  - Props: `event: WorkflowEvent`
  - Render based on event_type (switch statement)
  - Event types: workflow_started, workflow_paused, workflow_resumed, workflow_cancelled, workflow_completed, workflow_failed, phase_started, phase_completed, comment_added
  - Use icons/badges to distinguish types (Lucide icons)
  - Show created_at timestamp
  - For comment_added: delegate to WorkflowTimelineCommentItem
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineEventItem.tsx`

- [ ] 6.4 Create WorkflowTimelineCommentItem component
  - Props: `event: WorkflowEvent` (where event_type='comment_added')
  - Extract comment text from event_data.text
  - Extract comment_type from event_data.comment_type
  - Show user badge (from created_by_user relation)
  - Show timestamp (created_at)
  - Render artifacts if attached
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineCommentItem.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 7: Frontend - Integration & Cleanup

<!-- prettier-ignore -->
- [ ] 7.1 Update WorkflowExecutionDetail to use timeline
  - Import WorkflowTimeline component
  - Import buildTimeline utility
  - Build timeline from execution.steps and execution.events
  - Replace WorkflowExecutionStepsList and WorkflowExecutionComments with WorkflowTimeline
  - Keep WorkflowExecutionHeader unchanged
  - File: `apps/web/src/client/pages/projects/workflows/WorkflowExecutionDetail.tsx`

- [ ] 7.2 Update useWorkflowDefinition hook if needed
  - Check if hook needs updates for events vs comments
  - Update TanStack Query types to expect events array
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowDefinition.ts`

- [ ] 7.3 Delete old comment component
  - Remove file entirely (replaced by timeline)
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowExecutionComments.tsx`

- [ ] 7.4 Delete old steps list component
  - Remove file entirely (replaced by timeline)
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowExecutionStepsList.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 8: Testing & Validation

<!-- prettier-ignore -->
- [ ] 8.1 Test timeline display with mock data
  - Start dev server: `cd apps/web && pnpm dev`
  - Navigate to workflow execution detail page
  - Verify timeline shows steps, comments, system events in chronological order
  - Verify step expand/collapse works
  - Verify timestamps are formatted correctly

- [ ] 8.2 Test creating workflow-level comments
  - Add new comment to workflow execution
  - Verify comment appears as event in timeline
  - Verify comment has correct timestamp and user attribution

- [ ] 8.3 Test creating step-level comments
  - Add comment to specific step
  - Expand step in timeline
  - Verify comment appears nested inside expanded step details

- [ ] 8.4 Test pause/resume/cancel events
  - Pause a running workflow execution
  - Verify "workflow_paused" event appears in timeline
  - Resume workflow
  - Verify "workflow_resumed" event appears
  - Test cancel flow similarly

- [ ] 8.5 Test phase transitions display
  - Run workflow with multiple phases
  - Verify "phase_started" and "phase_completed" events appear
  - Verify phase names are displayed correctly

- [ ] 8.6 Run type checking
  - Run: `cd ../.. && pnpm check-types`
  - Expected: No type errors

- [ ] 8.7 Run linting
  - Run: `cd apps/web && pnpm lint`
  - Expected: No lint errors

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

**`buildTimeline.test.ts`** - Timeline builder utility:

```typescript
describe('buildTimeline', () => {
  it('should merge steps and events chronologically', () => {
    const steps = [
      { id: '1', started_at: '2025-01-03T10:00:00Z', ... },
      { id: '2', started_at: '2025-01-03T10:05:00Z', ... }
    ];
    const events = [
      { id: 'e1', event_type: 'comment_added', created_at: '2025-01-03T10:02:00Z', ... }
    ];

    const timeline = buildTimeline(steps, events);

    expect(timeline).toHaveLength(3);
    expect(timeline[0].type).toBe('step'); // 10:00
    expect(timeline[1].type).toBe('event'); // 10:02
    expect(timeline[2].type).toBe('step'); // 10:05
  });

  it('should skip items with no timestamp', () => {
    const steps = [
      { id: '1', started_at: null, ... }
    ];
    const events = [];

    const timeline = buildTimeline(steps, events);

    expect(timeline).toHaveLength(0);
  });
});
```

### Integration Tests

Test workflow execution flow end-to-end:
1. Create workflow execution
2. Start execution (verify workflow_started event created)
3. Advance through steps (verify step_started events created)
4. Add comments (verify comment_added events created)
5. Pause workflow (verify workflow_paused event created)
6. Resume workflow (verify workflow_resumed event created)
7. Complete workflow (verify workflow_completed event created)
8. Fetch execution and verify timeline displays all events

### Manual Testing

1. **Timeline Display**: Verify chronological order, visual styling, timestamps
2. **Step Expansion**: Click steps to expand/collapse details
3. **Comment Display**: Verify workflow-level and step-level comments appear correctly
4. **System Events**: Verify pause/resume/cancel events display with appropriate icons
5. **Phase Transitions**: Verify phase start/complete events show phase names
6. **Real-time Updates**: Start workflow, watch timeline update as events occur
7. **Dark Mode**: Test timeline appearance in dark mode

## Success Criteria

- [ ] WorkflowEvent table replaces WorkflowComment in database schema
- [ ] All existing comments migrated to events with event_type='comment_added'
- [ ] Timeline displays steps, comments, and system events chronologically
- [ ] Steps are collapsed by default, expandable to show details
- [ ] Step-level comments appear nested inside expanded step cards
- [ ] Workflow-level comments appear as standalone timeline items
- [ ] System events (pause/resume/cancel) display with appropriate styling
- [ ] Phase transitions visible in timeline with phase names
- [ ] No type errors in TypeScript compilation
- [ ] No lint errors
- [ ] Existing workflow execution pages work without errors
- [ ] Timeline updates in real-time as workflow progresses

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd ../.. && pnpm check-types
# Expected: No type errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors

# Build verification
cd apps/web && pnpm build
# Expected: Successful build with no errors

# Database verification
cd apps/web && pnpm prisma:studio
# Expected: Open Prisma Studio, verify workflow_events table exists
# Expected: No workflow_comments table
# Expected: Artifacts reference workflow_event_id
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: Workflows page, select workflow definition, select execution
3. Verify: Timeline displays with steps and events chronologically
4. Test expand/collapse: Click step to expand, verify details appear
5. Test adding comment: Add workflow-level comment, verify appears in timeline
6. Test step comment: Add comment to step, expand step, verify comment inside
7. Test pause: Pause workflow, verify pause event appears in timeline
8. Check console: No errors or warnings

**Feature-Specific Checks:**

- Timeline shows correct chronological order (steps, comments, events mixed)
- Step cards collapsed by default with name, status, phase, timestamp visible
- Expanded step shows duration, logs, session link, error, step comments
- Workflow-level comments render with user badge, timestamp, artifacts
- System events (pause/resume/cancel) render with appropriate icons/badges
- Phase transitions display with phase name and timing
- Dark mode styling works correctly for all timeline components
- Real-time updates: Start workflow in one tab, watch timeline update in another

## Implementation Notes

### 1. Migration Data Integrity

The Prisma migration must:
- Create `workflow_events` table
- Migrate all `workflow_comments` data to `workflow_events` with `event_type='comment_added'`
- Copy `text` field to `event_data` JSON: `{"text":"...", "comment_type":"..."}`
- Update `workflow_artifacts` foreign key from `workflow_comment_id` to `workflow_event_id`
- Drop `workflow_comments` table

Verify migration SQL before applying. Test on development database first.

### 2. Event Data JSON Structure

Store event-specific data in `event_data` JSON field with consistent structure:

```typescript
// comment_added
{ text: string; comment_type: 'user' | 'system' | 'agent' }

// phase_started / phase_completed
{ phase_name: string }

// workflow_paused / workflow_resumed / workflow_cancelled
{ user_id?: string; reason?: string }

// step_started
{ step_id: string; step_name: string }

// Future: command_executed
{ command: string; exit_code: number; output: string }
```

### 3. Timeline Performance

For large workflow executions (100+ events), consider:
- Pagination or virtualization (react-window)
- Lazy loading of step details
- Caching timeline computation results

Initial implementation assumes <100 total timeline items (reasonable for MVP).

### 4. Dual-Write Pattern

Timestamps on `WorkflowExecution` (`paused_at`, `cancelled_at`, etc.) remain source of truth for state queries. Events are supplementary for historical display only. When updating state:

1. Update timestamp field (e.g., `paused_at = new Date()`)
2. Create corresponding event (e.g., `event_type='workflow_paused'`)

This ensures backward compatibility and makes state queries fast (no JSON parsing).

### 5. Future Extensibility

The `WorkflowEvent` table is designed for future additions:
- Command execution events (`command_executed`)
- Git operation events (`git_commit`, `git_push`)
- Webhook events
- Custom user-defined events

Simply add new `event_type` values and define `event_data` structure. No schema changes required.

## Dependencies

- Prisma 6.17.x (already installed)
- @tanstack/react-query 5.x (already installed)
- Lucide icons (already installed)
- No new dependencies required

## Timeline

| Task              | Estimated Time |
| ----------------- | -------------- |
| Database Schema   | 1 hour         |
| Backend Services  | 2 hours        |
| Timeline Builder  | 1 hour         |
| Timeline UI       | 2-3 hours      |
| Integration       | 0.5 hours      |
| Testing           | 1-1.5 hours    |
| **Total**         | **6-8 hours**  |

## References

- Original feature discussion: This spec
- Prisma migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
- React discriminated unions: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview

## Next Steps

1. Review this spec with team/stakeholders
2. Confirm migration strategy (dual-write vs events-only)
3. Begin implementation with Task Group 1 (Database Schema)
4. Test migration on development database
5. Proceed through task groups sequentially
6. Perform manual testing after UI integration
7. Deploy to production after validation
