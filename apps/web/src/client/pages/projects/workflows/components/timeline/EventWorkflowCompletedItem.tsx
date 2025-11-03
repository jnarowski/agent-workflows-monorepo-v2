import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { getEventConfig } from "../../lib/eventConfig";
import type { EventWorkflowCompletedItemProps } from "./types";

/**
 * Workflow Completed event timeline item
 */
export function EventWorkflowCompletedItem({ event }: EventWorkflowCompletedItemProps) {
  const { title } = event.event_data;
  const config = getEventConfig("workflow_completed");

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
