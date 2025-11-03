import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { getEventConfig } from "../../lib/eventConfig";
import type { EventPhaseCompletedItemProps } from "./types";

/**
 * Phase Completed event timeline item
 */
export function EventPhaseCompletedItem({ event }: EventPhaseCompletedItemProps) {
  const { title, phase } = event.event_data;
  const config = getEventConfig("phase_completed");

  return (
    <TimelineRow icon={config.icon} iconColor={config.iconColor}>
      <TimelineHeader
        title={title}
        metadata={formatRelativeTime(event.created_at)}
        badge={<Badge variant={config.badgeVariant}>{phase}</Badge>}
      />
    </TimelineRow>
  );
}
