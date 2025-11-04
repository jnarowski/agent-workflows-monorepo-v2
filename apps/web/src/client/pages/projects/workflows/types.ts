import type {
  WorkflowStatus,
  StepStatus,
  WorkflowEventType,
} from "@/shared/schemas/workflow.schemas";

// Re-export types only
export type { WorkflowStatus, StepStatus, WorkflowEventType };

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  phases: Phase[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args_schema: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface Phase {
  name: string;
  steps: string[];
}

/**
 * Frontend-specific WorkflowExecution interface
 *
 * **Note**: This interface intentionally diverges from the backend response schema
 * (`workflowExecutionResponseSchema`) to meet frontend UI requirements:
 *
 * - Uses `created_by: string` instead of `user_id` (more descriptive for UI)
 * - Uses `current_step: string | null` instead of `current_step_index: number` (UI displays step name, not index)
 * - Omits `paused_at` and `cancelled_at` (not currently displayed in UI)
 * - Uses `Date` objects instead of ISO strings (easier to work with in React)
 * - Optional relations (`steps`, `events`, `artifacts`, `workflow_definition`) for flexibility
 *
 * This follows the hybrid approach: shared schemas validate API responses,
 * frontend defines interfaces optimized for UI needs.
 */
export interface WorkflowExecution {
  id: string;
  workflow_definition_id: string;
  workflow_definition?: WorkflowDefinition;
  project_id: string;
  name: string;
  status: WorkflowStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any> | null;
  current_step: string | null;
  current_phase: string | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  steps?: WorkflowExecutionStep[];
  events?: WorkflowEvent[];
  artifacts?: WorkflowArtifact[];
  _count?: {
    steps: number;
    events: number;
  };
}

export interface WorkflowExecutionStep {
  id: string;
  workflow_execution_id: string;
  name: string; // Fixed: was step_name, now matches Prisma
  phase: string; // Fixed: was phase_name, now matches Prisma
  status: StepStatus;
  logs: string | null;
  error_message: string | null;
  agent_session_id: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  artifacts?: WorkflowArtifact[];
}

// User information interface (for created_by_user relation)
export interface User {
  id: string;
  username: string;
}

// Base event data structure - all events have at minimum title and body
export interface BaseEventData {
  title: string;
  body: string;
}

// Event data type map (matching backend EventDataMap)
// All events use the same base structure (title + body) with optional additional fields
export interface EventDataMap {
  annotation_added: BaseEventData;
  workflow_started: BaseEventData;
  workflow_completed: BaseEventData;
  workflow_failed: BaseEventData & {
    error?: string;
  };
  workflow_paused: BaseEventData & {
    reason?: string;
  };
  workflow_resumed: BaseEventData;
  workflow_cancelled: BaseEventData & {
    reason?: string;
  };
  phase_started: BaseEventData & {
    phase: string;
  };
  phase_completed: BaseEventData & {
    phase: string;
  };
  step_started: BaseEventData & {
    step_id: string;
    step_name: string;
  };
}

// WorkflowEvent interface (replaces WorkflowComment)
export interface WorkflowEvent {
  id: string;
  workflow_execution_id: string;
  workflow_execution_step_id: string | null;
  event_type: WorkflowEventType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event_data: any; // JSON field, type-safe access via EventDataMap
  created_by_user_id: string | null;
  created_at: Date;
  created_by_user?: User | null;
  workflow_execution_step?: WorkflowExecutionStep | null;
  artifacts?: WorkflowArtifact[];
}

export interface WorkflowArtifact {
  id: string;
  workflow_execution_step_id: string | null;
  workflow_event_id: string | null;
  name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  created_at: Date;
}

// Re-export domain model types for timeline
export type {
  TimelineModel,
  TimelineItem,
  StepTimelineItem,
  EventTimelineItem,
  AnnotationTimelineItem,
  ExecutionSummary,
  LiveState,
} from "./utils/buildTimelineModel";

// Filter types
export interface WorkflowFilter {
  status?: WorkflowStatus;
  definitionId?: string;
  search?: string;
}
