import { useState } from "react";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBody } from "./TimelineBody";
import { ErrorDisplay } from "../ErrorDisplay";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import type { EventTimelineItem } from "../../lib/timelineModel";

export interface EventWorkflowFailedItemProps {
  item: EventTimelineItem;
}

/**
 * Workflow Failed event timeline item
 * Shows error message in expandable body
 * Uses pre-computed display properties from domain model
 */
export function EventWorkflowFailedItem({ item }: EventWorkflowFailedItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const eventData = item.event.event_data as { error?: string };
  const error = eventData.error;

  return (
    <TimelineRow icon={item.display.icon} iconColor={item.display.iconColor}>
      <TimelineHeader
        title={item.metadata.title}
        metadata={formatRelativeTime(item.event.created_at)}
        badge={<Badge variant={item.display.badgeVariant}>{item.display.label}</Badge>}
      />

      {error && (
        <TimelineBody isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
          <ErrorDisplay error={error} />
        </TimelineBody>
      )}
    </TimelineRow>
  );
}
