import type { TimelineModel } from "../lib/buildTimelineModel";
import { StepItem } from "./timeline/StepItem";
import { EventItem } from "./timeline/EventItem";
import { EventAnnotationItem } from "./timeline/EventAnnotationItem";

interface WorkflowTimelineProps {
  model: TimelineModel;
  projectId: string;
}

/**
 * Vertical timeline displaying workflow steps and events chronologically
 *
 * Renders a timeline with visual line connector showing the chronological flow
 * of all workflow activities (steps, annotations, system events, phase transitions).
 *
 * The timeline model is pre-computed with all display properties, filtering,
 * and calculations performed in the domain layer. This component is a "dumb renderer"
 * that just maps over the model items.
 */
export function WorkflowTimeline({ model, projectId }: WorkflowTimelineProps) {
  if (model.items.length === 0) {
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

        {/* Timeline items - domain model based routing */}
        {model.items.map((item) => {
          const key = `${item.itemType}-${item.id}`;

          // Route to appropriate component based on item type (discriminated union)
          switch (item.itemType) {
            case "step":
              return <StepItem key={key} item={item} projectId={projectId} />;

            case "event":
              return <EventItem key={key} item={item} />;

            case "annotation":
              // Standalone annotation (not attached to a step)
              return <EventAnnotationItem key={key} annotation={item} />;

            default: {
              // TypeScript exhaustiveness check
              const _exhaustive: never = item;
              console.warn("Unknown timeline item type:", _exhaustive);
              return null;
            }
          }
        })}
      </div>
    </div>
  );
}
