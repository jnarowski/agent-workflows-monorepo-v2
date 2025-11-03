import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { getEventConfig } from "../../lib/eventConfig";
import type { EventPhaseStartedItemProps } from "./types";

/**
 * Phase Started event timeline item
 */
export function EventPhaseStartedItem({ event }: EventPhaseStartedItemProps) {
  const { title } = event.event_data;
  const config = getEventConfig("phase_started");

  return (
    <TimelineRow icon={config.icon} iconColor={config.iconColor}>
      <TimelineHeader
        title={title}
        metadata={formatRelativeTime(event.created_at)}
        badge={<Badge variant={config.badgeVariant}>Phase</Badge>}
      />
    </TimelineRow>
  );
}
