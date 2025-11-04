import type { StepAnnotation } from "../../lib/buildTimelineModel";
import { StepAnnotationItem } from "./StepAnnotationItem";

export interface StepAnnotationsProps {
  stepEvents: StepAnnotation[];
}

/**
 * Step annotations section
 * Renders a list of annotation events associated with a workflow step
 *
 * Annotations are immutable system notes (not editable user comments).
 * They are pre-filtered for the current step in the domain model.
 */
export function StepAnnotations({ stepEvents }: StepAnnotationsProps) {
  if (stepEvents.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">Annotations</p>
      <div className="space-y-2">
        {stepEvents.map((annotation) => (
          <StepAnnotationItem key={annotation.id} annotation={annotation} />
        ))}
      </div>
    </div>
  );
}
