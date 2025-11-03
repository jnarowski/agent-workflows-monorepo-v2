import { useState } from "react";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBody } from "./TimelineBody";
import { ErrorDisplay } from "../ErrorDisplay";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { getEventConfig } from "../../lib/eventConfig";
import type { EventWorkflowFailedItemProps } from "./types";

/**
 * Workflow Failed event timeline item
 * Shows error message in expandable body
 */
export function EventWorkflowFailedItem({ event }: EventWorkflowFailedItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { title, error } = event.event_data;
  const config = getEventConfig("workflow_failed");

  return (
    <TimelineRow icon={config.icon} iconColor={config.iconColor}>
      <TimelineHeader
        title={title}
        metadata={formatRelativeTime(event.created_at)}
        badge={<Badge variant={config.badgeVariant}>{config.label}</Badge>}
      />

      {error && (
        <TimelineBody isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
          <ErrorDisplay error={error} />
        </TimelineBody>
      )}
    </TimelineRow>
  );
}
