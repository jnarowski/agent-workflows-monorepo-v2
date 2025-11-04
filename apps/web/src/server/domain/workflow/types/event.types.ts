import type { WorkflowEvent } from '@prisma/client';

// Event types
export type WorkflowEventType =
  | 'annotation_added'
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_paused'
  | 'workflow_resumed'
  | 'workflow_cancelled'
  | 'phase_started'
  | 'phase_completed'
  | 'step_started';

// Base event data structure - all events have at minimum title and body
export interface BaseEventData {
  title: string;
  body: string;
}

// Event data map for type-safe event_data
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

// Export WorkflowEvent type from Prisma
export type { WorkflowEvent };
