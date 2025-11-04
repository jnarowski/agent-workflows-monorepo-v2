import type {
  WorkflowExecutionStep,
  WorkflowEvent,
  TimelineItem,
} from '../types';

/**
 * Build chronological timeline from workflow steps and events
 *
 * Merges steps (using started_at timestamp) and events (using created_at timestamp)
 * into a single chronological array. Items without timestamps are filtered out.
 *
 * @param steps - Workflow execution steps
 * @param events - Workflow events (comments, system events, phase transitions)
 * @returns Sorted timeline items in chronological order (oldest first)
 */
export function buildTimeline(
  steps: WorkflowExecutionStep[] = [],
  events: WorkflowEvent[] = []
): TimelineItem[] {
  const timeline: TimelineItem[] = [];

  // Map steps to timeline items (using started_at timestamp)
  for (const step of steps) {
    if (step.started_at) {
      timeline.push({
        type: 'step',
        data: step,
        timestamp: new Date(step.started_at),
      });
    }
  }

  // Map events to timeline items (using created_at timestamp)
  for (const event of events) {
    if (event.created_at) {
      timeline.push({
        type: 'event',
        data: event,
        timestamp: new Date(event.created_at),
      });
    }
  }

  // Sort by timestamp ascending (oldest first)
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return timeline;
}
