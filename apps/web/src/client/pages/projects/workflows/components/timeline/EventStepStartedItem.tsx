import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { getEventConfig } from "../../lib/eventConfig";
import type { EventStepStartedItemProps } from "./types";

/**
 * Step Started event timeline item
 */
export function EventStepStartedItem({ event }: EventStepStartedItemProps) {
  const { title, step_name } = event.event_data;
  const config = getEventConfig("step_started");

  return (
    <TimelineRow icon={config.icon} iconColor={config.iconColor}>
      <TimelineHeader
        title={title}
        metadata={formatRelativeTime(event.created_at)}
        badge={<Badge variant={config.badgeVariant}>{step_name}</Badge>}
      />
    </TimelineRow>
  );
}
