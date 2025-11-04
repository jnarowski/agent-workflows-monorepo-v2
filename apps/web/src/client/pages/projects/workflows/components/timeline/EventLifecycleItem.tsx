import { useState } from "react";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBody } from "./TimelineBody";
import { ErrorDisplay } from "../ErrorDisplay";
import { ArtifactList } from "../ArtifactList";
import { Badge } from "@/client/components/ui/badge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import type { EventTimelineItem } from "../../lib/buildTimelineModel";

export interface EventLifecycleItemProps {
  item: EventTimelineItem;
}

/**
 * Consolidated lifecycle event timeline item
 *
 * Handles all workflow, phase, and step lifecycle events using the pre-computed
 * display properties from the domain model. This replaces 9 individual event
 * components that were nearly identical.
 *
 * Supported event types:
 * - workflow_started, workflow_completed, workflow_failed, workflow_paused,
 *   workflow_resumed, workflow_cancelled
 * - phase_started, phase_completed
 * - step_started
 *
 * Uses pre-computed display properties from domain model (icon, color, label, variant).
 */
export function EventLifecycleItem({ item }: EventLifecycleItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract event-specific data
  const eventData = item.event.event_data || {};
  const body = item.metadata.body;

  // Determine badge text (phase name, step name, or default label)
  const badgeText =
    eventData.phase ||
    eventData.step_name ||
    item.display.label;

  // Check for expandable content
  const hasError = !!eventData.error;
  const hasReason = !!eventData.reason;
  const hasBody = body && body.length > 0;
  const hasArtifacts = item.event.artifacts && item.event.artifacts.length > 0;
  const hasExpandableContent = hasError || hasReason || hasBody || hasArtifacts;

  return (
    <TimelineRow icon={item.display.icon} iconColor={item.display.iconColor}>
      <TimelineHeader
        title={item.metadata.title}
        metadata={formatRelativeTime(item.event.created_at)}
        badge={<Badge variant={item.display.badgeVariant}>{badgeText}</Badge>}
        onClick={hasExpandableContent ? () => setIsExpanded(!isExpanded) : undefined}
        isExpandable={hasExpandableContent}
      />

      {hasExpandableContent && (
        <TimelineBody isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
          <div className="space-y-3">
            {/* Error display for failed events */}
            {hasError && <ErrorDisplay error={eventData.error} />}

            {/* Reason display for paused/cancelled events */}
            {hasReason && !hasError && (
              <p className="text-sm text-muted-foreground">{eventData.reason}</p>
            )}

            {/* Generic body text */}
            {hasBody && !hasError && !hasReason && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{body}</p>
            )}

            {/* Artifacts */}
            {hasArtifacts && <ArtifactList artifacts={item.event.artifacts!} size="sm" />}
          </div>
        </TimelineBody>
      )}
    </TimelineRow>
  );
}
