import type { EventTimelineItem } from "../../lib/timelineModel";
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

export interface EventItemProps {
  item: EventTimelineItem;
}

/**
 * Workflow event timeline item dispatcher
 * Routes to specific event type components, or uses EventDefaultItem for unknown types
 *
 * This is the single point where we route events based on event_type discriminant.
 * Child components receive the full EventTimelineItem with pre-computed display properties.
 */
export function EventItem({ item }: EventItemProps) {
  switch (item.event.event_type) {
    case "workflow_started":
      return <EventWorkflowStartedItem item={item} />;
    case "workflow_completed":
      return <EventWorkflowCompletedItem item={item} />;
    case "workflow_failed":
      return <EventWorkflowFailedItem item={item} />;
    case "workflow_paused":
      return <EventWorkflowPausedItem item={item} />;
    case "workflow_resumed":
      return <EventWorkflowResumedItem item={item} />;
    case "workflow_cancelled":
      return <EventWorkflowCancelledItem item={item} />;
    case "phase_started":
      return <EventPhaseStartedItem item={item} />;
    case "phase_completed":
      return <EventPhaseCompletedItem item={item} />;
    case "step_started":
      return <EventStepStartedItem item={item} />;
    case "annotation_added":
      // Annotations are handled separately (attached to steps or shown standalone)
      return null;
    default:
      // Unknown event type - use default renderer with title/body
      return <EventDefaultItem item={item} />;
  }
}
