import { useMemo } from "react";
import type { TimelineItem, WorkflowEvent } from "../types";
import { StepItem } from "./timeline/StepItem";
import { EventItem } from "./timeline/EventItem";
import { EventCommentItem } from "./timeline/EventCommentItem";

interface WorkflowTimelineProps {
  items: TimelineItem[];
  projectId: string;
}

/**
 * Vertical timeline displaying workflow steps and events chronologically
 *
 * Renders a timeline with visual line connector showing the chronological flow
 * of all workflow activities (steps, comments, system events, phase transitions).
 */
export function WorkflowTimeline({ items, projectId }: WorkflowTimelineProps) {
  // Memoize step events filtering for performance
  const stepEventsMap = useMemo(() => {
    const map = new Map<string, WorkflowEvent[]>();

    items.forEach((item) => {
      if (
        item.type === "event" &&
        item.data.workflow_execution_step_id &&
        item.data.event_type === "comment_added"
      ) {
        const stepId = item.data.workflow_execution_step_id;
        if (!map.has(stepId)) {
          map.set(stepId, []);
        }
        map.get(stepId)!.push(item.data);
      }
    });

    return map;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No timeline events to display</p>
      </div>
    );
  }

  return (
    <div className="px-6">
      <div className="relative ml-4 space-y-6">
        {/* Vertical timeline connector line */}
        <div className="absolute left-0 inset-y-0 border-l-2" />

        {/* Timeline items - registry-based routing */}
        {items.map((item) => {
          const key = `${item.type}-${item.data.id}`;

          // Route to appropriate component based on item type
          switch (item.type) {
            case "step":
              return (
                <StepItem
                  key={key}
                  step={item.data}
                  projectId={projectId}
                  stepEvents={stepEventsMap.get(item.data.id) || []}
                />
              );

            case "event":
              // Check if this is a comment event (not nested in a step)
              if (
                item.data.event_type === "comment_added" &&
                !item.data.workflow_execution_step_id
              ) {
                return <EventCommentItem key={key} event={item.data} />;
              }
              return <EventItem key={key} event={item.data} />;

            case "comment":
              return <EventCommentItem key={key} event={item.data} />;

            default:
              console.warn(`Unknown timeline item type: ${(item as any).type}`);
              return null;
          }
        })}
      </div>
    </div>
  );
}
