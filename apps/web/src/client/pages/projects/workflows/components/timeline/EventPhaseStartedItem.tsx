import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import type { EventTimelineItem } from "../../lib/timelineModel";

export interface EventPhaseStartedItemProps {
  item: EventTimelineItem;
}

/**
 * Phase Started event timeline item
 * Uses pre-computed display properties from domain model
 */
export function EventPhaseStartedItem({ item }: EventPhaseStartedItemProps) {
  return (
    <TimelineRow icon={item.display.icon} iconColor={item.display.iconColor}>
      <TimelineHeader
        title={item.metadata.title}
        metadata={formatRelativeTime(item.event.created_at)}
        badge={<Badge variant={item.display.badgeVariant}>Phase</Badge>}
      />
    </TimelineRow>
  );
}
