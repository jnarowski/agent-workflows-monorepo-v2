import { useMemo, useRef, useEffect } from "react";
import type { TimelineModel } from "../utils/buildTimelineModel";
import { groupTimelineByPhase } from "../utils/groupTimelineByPhase";
import { PhaseCard } from "./timeline/PhaseCard";
import { EventItem } from "./timeline/EventItem";
import { EventAnnotationItem } from "./timeline/EventAnnotationItem";

interface WorkflowTimelineProps {
  model: TimelineModel;
  projectId: string;
}

/**
 * Phase-grouped timeline displaying workflow execution history
 *
 * Groups timeline items by phase, with workflow-level events shown outside phase cards.
 * Each phase is rendered as a collapsible PhaseCard component with nested items.
 * Auto-scrolls to active phase on mount.
 *
 * Pipeline: buildTimelineModel() → groupTimelineByPhase() → render
 */
export function WorkflowTimeline({ model, projectId }: WorkflowTimelineProps) {
  const activePhaseRef = useRef<HTMLDivElement>(null);

  // Group timeline items by phase (memoized to avoid re-computation)
  const grouped = useMemo(() => groupTimelineByPhase(model), [model]);

  // Auto-scroll to active phase on mount
  useEffect(() => {
    if (activePhaseRef.current) {
      activePhaseRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  // Empty state
  if (grouped.phases.length === 0 && grouped.workflowEvents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No workflow execution history to display</p>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-4">
      {/* Workflow-level events (top) */}
      {grouped.workflowEvents.length > 0 && (
        <div className="space-y-2">
          {grouped.workflowEvents.map((item) => {
            const key = `${item.itemType}-${item.id}`;
            if (item.itemType === "event") {
              return <EventItem key={key} item={item} />;
            } else if (item.itemType === "annotation") {
              return <EventAnnotationItem key={key} annotation={item} />;
            }
            return null;
          })}
        </div>
      )}

      {/* Phase cards */}
      {grouped.phases.map((phase) => {
        const isActive = phase.metadata.status === "running";
        return (
          <div
            key={phase.name}
            ref={isActive ? activePhaseRef : null}
          >
            <PhaseCard phase={phase} projectId={projectId} />
          </div>
        );
      })}
    </div>
  );
}
