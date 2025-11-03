import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { getEventConfig } from "../../lib/eventConfig";
import type { EventWorkflowStartedItemProps } from "./types";

/**
 * Workflow Started event timeline item
 */
export function EventWorkflowStartedItem({ event }: EventWorkflowStartedItemProps) {
  const { title } = event.event_data;
  const config = getEventConfig("workflow_started");

  return (
    <TimelineRow icon={config.icon} iconColor={config.iconColor}>
      <TimelineHeader
        title={title}
        metadata={formatRelativeTime(event.created_at)}
        badge={<Badge variant={config.badgeVariant}>{config.label}</Badge>}
      />
    </TimelineRow>
  );
}
