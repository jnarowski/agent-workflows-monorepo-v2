import type { TimelineItem, WorkflowEvent } from '../types';
import { WorkflowTimelineStepItem } from './WorkflowTimelineStepItem';
import { WorkflowTimelineEventItem } from './WorkflowTimelineEventItem';

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
    <div className="relative space-y-4">
      {/* Vertical timeline connector line */}
      <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-border" />

      {/* Timeline items */}
      {items.map((item) => (
        <div key={`${item.type}-${item.data.id}`} className="relative">
          {item.type === 'step' ? (
            <WorkflowTimelineStepItem
              step={item.data}
              stepEvents={getStepEvents(items, item.data.id)}
            />
          ) : (
            <WorkflowTimelineEventItem event={item.data} />
          )}
        </div>
      ))}
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
