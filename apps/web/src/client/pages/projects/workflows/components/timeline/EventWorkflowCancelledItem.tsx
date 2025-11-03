import { useState } from "react";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBody } from "./TimelineBody";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { getEventConfig } from "../../lib/eventConfig";
import type { EventWorkflowCancelledItemProps } from "./types";

/**
 * Workflow Cancelled event timeline item
 * Shows cancellation reason if provided
 */
export function EventWorkflowCancelledItem({ event }: EventWorkflowCancelledItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { title, reason } = event.event_data;
  const config = getEventConfig("workflow_cancelled");

  return (
    <TimelineRow icon={config.icon} iconColor={config.iconColor}>
      <TimelineHeader
        title={title}
        metadata={formatRelativeTime(event.created_at)}
        badge={<Badge variant={config.badgeVariant}>{config.label}</Badge>}
      />

      {reason && (
        <TimelineBody isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
          <p className="text-sm text-muted-foreground">{reason}</p>
        </TimelineBody>
      )}
    </TimelineRow>
  );
}
