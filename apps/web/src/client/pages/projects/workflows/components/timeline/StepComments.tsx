import type { WorkflowEvent } from "../../types";
import { StepCommentItem } from "./StepCommentItem";

export interface StepCommentsProps {
  stepEvents: WorkflowEvent[];
}

/**
 * Step comments section
 * Renders a list of comment events associated with a workflow step
 */
export function StepComments({ stepEvents }: StepCommentsProps) {
  if (stepEvents.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">Comments</p>
      <div className="space-y-2">
        {stepEvents.map((event) => (
          <StepCommentItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
