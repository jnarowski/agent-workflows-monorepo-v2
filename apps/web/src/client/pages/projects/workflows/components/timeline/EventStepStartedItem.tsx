import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import type { EventTimelineItem } from "../../lib/timelineModel";

export interface EventStepStartedItemProps {
  item: EventTimelineItem;
}

/**
 * Step Started event timeline item
 * Uses pre-computed display properties from domain model
 */
export function EventStepStartedItem({ item }: EventStepStartedItemProps) {
  const eventData = item.event.event_data as { step_name: string };
  const step_name = eventData.step_name;

  return (
    <TimelineRow icon={item.display.icon} iconColor={item.display.iconColor}>
      <TimelineHeader
        title={item.metadata.title}
        metadata={formatRelativeTime(item.event.created_at)}
        badge={<Badge variant={item.display.badgeVariant}>{step_name}</Badge>}
      />
    </TimelineRow>
  );
}
