import type { TimelineItem, WorkflowEvent } from '../types';
import { WorkflowTimelineItem } from './WorkflowTimelineItem';

interface WorkflowTimelineProps {
  items: TimelineItem[];
}

/**
 * Vertical timeline displaying workflow steps and events chronologically
 *
 * Renders a timeline with visual line connector showing the chronological flow
 * of all workflow activities (steps, comments, system events, phase transitions).
 */
export function WorkflowTimeline({ items }: WorkflowTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No timeline events to display</p>
      </div>
    );
  }

  return (
    <div className="max-w-(--breakpoint-sm) mx-auto py-12 md:py-20 px-6">
      <div className="relative ml-4 space-y-6">
        {/* Vertical timeline connector line */}
        <div className="absolute left-0 inset-y-0 border-l-2" />

        {/* Timeline items */}
        {items.map((item) => (
          <WorkflowTimelineItem
            key={`${item.type}-${item.data.id}`}
            item={item}
            stepEvents={item.type === 'step' ? getStepEvents(items, item.data.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Extract events that belong to a specific step (step-level comments)
 */
function getStepEvents(items: TimelineItem[], stepId: string): WorkflowEvent[] {
  return items
    .filter(
      (item) =>
        item.type === 'event' &&
        item.data.workflow_execution_step_id === stepId &&
        item.data.event_type === 'comment_added'
    )
    .map((item) => (item as { type: 'event'; data: WorkflowEvent }).data);
}
