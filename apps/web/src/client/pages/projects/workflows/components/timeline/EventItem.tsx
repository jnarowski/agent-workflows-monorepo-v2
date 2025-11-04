import type { EventTimelineItem } from "../../utils/buildTimelineModel";
import { EventLifecycleItem } from "./EventLifecycleItem";
import { EventDefaultItem } from "./EventDefaultItem";

export interface EventItemProps {
  item: EventTimelineItem;
}

/**
 * Workflow event timeline item dispatcher
 * Routes to appropriate event renderer based on event_type discriminant.
 *
 * Most lifecycle events (workflow/phase/step) use the consolidated EventLifecycleItem.
 * Unknown event types fall back to EventDefaultItem.
 */
export function EventItem({ item }: EventItemProps) {
  switch (item.event.event_type) {
    case "annotation_added":
      // Annotations are handled separately (attached to steps or shown standalone)
      return null;

    // All lifecycle events use consolidated component
    case "workflow_started":
    case "workflow_completed":
    case "workflow_failed":
    case "workflow_paused":
    case "workflow_resumed":
    case "workflow_cancelled":
    case "phase_started":
    case "phase_completed":
    case "step_started":
      return <EventLifecycleItem item={item} />;

    default:
      // Unknown event type - use default renderer with title/body
      return <EventDefaultItem item={item} />;
  }
}
