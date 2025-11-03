import { ArtifactList } from "../ArtifactList";
import type { EventOfType } from "./types";

export interface StepCommentItemProps {
  event: EventOfType<"comment_added">;
}

/**
 * Step comment item for nested display within workflow steps
 * Renders with background and padding similar to logs/errors
 */
export function StepCommentItem({ event }: StepCommentItemProps) {
  const { body } = event.event_data;

  return (
    <div className="rounded-md bg-muted p-3 space-y-4">
      {body && (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{body}</p>
      )}

      {event.artifacts && event.artifacts.length > 0 && (
        <div className="mt-2">
          <ArtifactList artifacts={event.artifacts} size="sm" />
        </div>
      )}
    </div>
  );
}
