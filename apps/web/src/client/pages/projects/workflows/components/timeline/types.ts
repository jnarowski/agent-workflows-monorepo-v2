/**
 * Type-safe props for timeline event components
 *
 * Each event component receives a strongly-typed event prop that enforces:
 * 1. Correct event_type value
 * 2. Correct event_data structure matching EventDataMap
 *
 * This eliminates the need for type casting and provides full autocomplete.
 */

import type { WorkflowEvent, WorkflowEventType, EventDataMap } from '../../types';

/**
 * Helper type to extract a specific event type from WorkflowEvent
 * Narrows event_type and event_data to the specific variant
 */
export type EventOfType<T extends WorkflowEventType> = WorkflowEvent & {
  event_type: T;
  event_data: EventDataMap[T];
};

// Type-safe props for each event component

export interface EventWorkflowStartedItemProps {
  event: EventOfType<'workflow_started'>;
}

export interface EventWorkflowCompletedItemProps {
  event: EventOfType<'workflow_completed'>;
}

export interface EventWorkflowFailedItemProps {
  event: EventOfType<'workflow_failed'>;
}

export interface EventWorkflowPausedItemProps {
  event: EventOfType<'workflow_paused'>;
}

export interface EventWorkflowResumedItemProps {
  event: EventOfType<'workflow_resumed'>;
}

export interface EventWorkflowCancelledItemProps {
  event: EventOfType<'workflow_cancelled'>;
}

export interface EventPhaseStartedItemProps {
  event: EventOfType<'phase_started'>;
}

export interface EventPhaseCompletedItemProps {
  event: EventOfType<'phase_completed'>;
}

export interface EventStepStartedItemProps {
  event: EventOfType<'step_started'>;
}

export interface EventCommentItemProps {
  event: EventOfType<'annotation_added'>;
  nested?: boolean; // For when rendered inside a step
}

export interface EventDefaultItemProps {
  event: WorkflowEvent; // Can handle any event type
}
