import { useState } from "react";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBody } from "./TimelineBody";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import type { EventTimelineItem } from "../../lib/timelineModel";

export interface EventWorkflowCancelledItemProps {
  item: EventTimelineItem;
}

/**
 * Workflow Cancelled event timeline item
 * Shows cancellation reason if provided
 * Uses pre-computed display properties from domain model
 */
export function EventWorkflowCancelledItem({ item }: EventWorkflowCancelledItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const eventData = item.event.event_data as { reason?: string };
  const reason = eventData.reason;

  return (
    <TimelineRow icon={item.display.icon} iconColor={item.display.iconColor}>
      <TimelineHeader
        title={item.metadata.title}
        metadata={formatRelativeTime(item.event.created_at)}
        badge={<Badge variant={item.display.badgeVariant}>{item.display.label}</Badge>}
      />

      {reason && (
        <TimelineBody isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
          <p className="text-sm text-muted-foreground">{reason}</p>
        </TimelineBody>
      )}
    </TimelineRow>
  );
}
