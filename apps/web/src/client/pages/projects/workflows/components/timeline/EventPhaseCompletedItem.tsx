import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import type { EventTimelineItem } from "../../lib/timelineModel";

export interface EventPhaseCompletedItemProps {
  item: EventTimelineItem;
}

/**
 * Phase Completed event timeline item
 * Uses pre-computed display properties from domain model
 */
export function EventPhaseCompletedItem({ item }: EventPhaseCompletedItemProps) {
  const eventData = item.event.event_data as { phase: string };
  const phase = eventData.phase;

  return (
    <TimelineRow icon={item.display.icon} iconColor={item.display.iconColor}>
      <TimelineHeader
        title={item.metadata.title}
        metadata={formatRelativeTime(item.event.created_at)}
        badge={<Badge variant={item.display.badgeVariant}>{phase}</Badge>}
      />
    </TimelineRow>
  );
}
