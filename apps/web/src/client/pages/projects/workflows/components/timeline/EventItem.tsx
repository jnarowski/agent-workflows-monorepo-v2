import type { WorkflowEvent } from "../../types";
import { EventWorkflowStartedItem } from "./EventWorkflowStartedItem";
import { EventWorkflowCompletedItem } from "./EventWorkflowCompletedItem";
import { EventWorkflowFailedItem } from "./EventWorkflowFailedItem";
import { EventWorkflowPausedItem } from "./EventWorkflowPausedItem";
import { EventWorkflowResumedItem } from "./EventWorkflowResumedItem";
import { EventWorkflowCancelledItem } from "./EventWorkflowCancelledItem";
import { EventPhaseStartedItem } from "./EventPhaseStartedItem";
import { EventPhaseCompletedItem } from "./EventPhaseCompletedItem";
import { EventStepStartedItem } from "./EventStepStartedItem";
import { EventDefaultItem } from "./EventDefaultItem";
import type { EventOfType } from "./types";

export interface EventItemProps {
  event: WorkflowEvent;
}

/**
 * Workflow event timeline item dispatcher
 * Routes to specific event type components, or uses EventDefaultItem for unknown types
 *
 * This is the single point where we assert event types based on event_type discriminant.
 * All child components receive properly typed events with no casting required.
 */
export function EventItem({ event }: EventItemProps) {
  switch (event.event_type) {
    case "workflow_started":
      return <EventWorkflowStartedItem event={event as EventOfType<'workflow_started'>} />;
    case "workflow_completed":
      return <EventWorkflowCompletedItem event={event as EventOfType<'workflow_completed'>} />;
    case "workflow_failed":
      return <EventWorkflowFailedItem event={event as EventOfType<'workflow_failed'>} />;
    case "workflow_paused":
      return <EventWorkflowPausedItem event={event as EventOfType<'workflow_paused'>} />;
    case "workflow_resumed":
      return <EventWorkflowResumedItem event={event as EventOfType<'workflow_resumed'>} />;
    case "workflow_cancelled":
      return <EventWorkflowCancelledItem event={event as EventOfType<'workflow_cancelled'>} />;
    case "phase_started":
      return <EventPhaseStartedItem event={event as EventOfType<'phase_started'>} />;
    case "phase_completed":
      return <EventPhaseCompletedItem event={event as EventOfType<'phase_completed'>} />;
    case "step_started":
      return <EventStepStartedItem event={event as EventOfType<'step_started'>} />;
    case "comment_added":
      // Comments are handled by EventCommentItem, not this dispatcher
      return null;
    default:
      // Unknown event type - use default renderer with title/body
      return <EventDefaultItem event={event} />;
  }
}
