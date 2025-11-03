import { useState } from "react";
import type { BaseEventData } from "../../types";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBody } from "./TimelineBody";
import { ArtifactList } from "../ArtifactList";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { getEventConfig } from "../../lib/eventConfig";
import type { EventDefaultItemProps } from "./types";

/**
 * Default event timeline item
 * Uses standard title and body fields from event_data
 * Handles any event type using the base event data structure
 */
export function EventDefaultItem({ event }: EventDefaultItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // All events have title and body in their event_data
  const { title, body } = event.event_data as BaseEventData;
  const config = getEventConfig(event.event_type);

  // Check if there's expandable content
  const hasExpandableContent =
    (body && body.length > 0) ||
    (event.artifacts && event.artifacts.length > 0);

  return (
    <TimelineRow icon={config.icon} iconColor={config.iconColor}>
      <TimelineHeader
        title={title}
        metadata={formatRelativeTime(event.created_at)}
        badge={<Badge variant={config.badgeVariant}>{config.label}</Badge>}
        onClick={hasExpandableContent ? () => setIsExpanded(!isExpanded) : undefined}
        isExpandable={hasExpandableContent}
      />

      {hasExpandableContent && (
        <TimelineBody isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
          <div className="space-y-3">
            {/* Body text */}
            {body && body.length > 0 && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {body}
              </p>
            )}

            {/* Artifacts */}
            {event.artifacts && event.artifacts.length > 0 && (
              <ArtifactList artifacts={event.artifacts} size="sm" />
            )}
          </div>
        </TimelineBody>
      )}
    </TimelineRow>
  );
}
