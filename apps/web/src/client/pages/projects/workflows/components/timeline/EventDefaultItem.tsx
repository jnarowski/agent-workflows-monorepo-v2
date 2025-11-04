import { useState } from "react";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBody } from "./TimelineBody";
import { ArtifactList } from "../ArtifactList";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import type { EventTimelineItem } from "../../lib/buildTimelineModel";

export interface EventDefaultItemProps {
  item: EventTimelineItem;
}

/**
 * Default event timeline item
 * Uses pre-computed display properties from domain model
 * Handles any event type using the base event data structure
 */
export function EventDefaultItem({ item }: EventDefaultItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if there's expandable content
  const body = item.metadata.body;
  const hasExpandableContent =
    (body && body.length > 0) ||
    (item.event.artifacts && item.event.artifacts.length > 0);

  return (
    <TimelineRow icon={item.display.icon} iconColor={item.display.iconColor}>
      <TimelineHeader
        title={item.metadata.title}
        metadata={formatRelativeTime(item.event.created_at)}
        badge={<Badge variant={item.display.badgeVariant}>{item.display.label}</Badge>}
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
            {item.event.artifacts && item.event.artifacts.length > 0 && (
              <ArtifactList artifacts={item.event.artifacts} size="sm" />
            )}
          </div>
        </TimelineBody>
      )}
    </TimelineRow>
  );
}
