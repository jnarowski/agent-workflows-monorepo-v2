import type { StepAnnotation } from "../../lib/buildTimelineModel";
import { ArtifactList } from "../ArtifactList";

export interface StepAnnotationItemProps {
  annotation: StepAnnotation;
}

/**
 * Step annotation item for nested display within workflow steps
 * Renders with background and padding similar to logs/errors
 *
 * Annotations are immutable system notes (not editable user comments).
 */
export function StepAnnotationItem({ annotation }: StepAnnotationItemProps) {
  return (
    <div className="rounded-md bg-muted p-3 space-y-3">
      <p className="text-sm text-foreground/90 whitespace-pre-wrap">
        {annotation.text}
      </p>

      {/* Show artifacts attached to this annotation - within the card */}
      {annotation.artifacts.length > 0 && (
        <div className="border-t border-border/50 pt-2 mt-2">
          <ArtifactList artifacts={annotation.artifacts} variant="inline" />
        </div>
      )}
    </div>
  );
}
