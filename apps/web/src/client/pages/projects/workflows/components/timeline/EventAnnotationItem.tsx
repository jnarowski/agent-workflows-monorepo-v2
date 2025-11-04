import { memo } from "react";
import { MessageSquare } from "lucide-react";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import type { AnnotationTimelineItem } from "../../utils/buildTimelineModel";

export interface EventAnnotationItemProps {
  annotation: AnnotationTimelineItem;
}

/**
 * Annotation event timeline item (formerly "comment")
 * Standardized using shared TimelineRow + TimelineHeader components
 * Uses pre-computed display properties from domain model
 */
function EventAnnotationItemComponent({ annotation }: EventAnnotationItemProps) {
  // Type-safe access to annotation data
  const body = annotation.metadata.text || "";
  const username = annotation.metadata.created_by_username || "System";

  return (
    <TimelineRow icon={MessageSquare} iconColor="bg-accent text-accent-foreground">
      <TimelineHeader
        title={`Annotation by ${username}`}
        subtitle={body}
        metadata={formatRelativeTime(annotation.event.created_at)}
      />
    </TimelineRow>
  );
}

/**
 * Memoized EventAnnotationItem to prevent unnecessary re-renders
 */
export const EventAnnotationItem = memo(EventAnnotationItemComponent);
