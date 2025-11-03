import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { getEventConfig } from "../../lib/eventConfig";
import type { EventCommentItemProps } from "./types";

/**
 * Comment event timeline item
 * Standardized using shared TimelineRow + TimelineHeader + TimelineBody components
 */
export function EventCommentItem({ event }: EventCommentItemProps) {
  // Type-safe access to comment data (already parsed by backend)
  const { body } = event.event_data;

  // Standalone mode: Use standardized shared components
  const config = getEventConfig("comment_added");

  return (
    <TimelineRow icon={config.icon} iconColor={config.iconColor}>
      <TimelineHeader
        title="Comment Added"
        subtitle={body}
        metadata={formatRelativeTime(event.created_at)}
      />
    </TimelineRow>
  );
}
