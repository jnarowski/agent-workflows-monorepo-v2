import { useMemo, useRef, useEffect } from "react";
// @ts-ignore - missing modules
import type { TimelineModel } from "../utils/buildTimelineModel";
// @ts-ignore - missing modules
import { groupTimelineByPhase } from "../utils/groupTimelineByPhase";
// @ts-ignore - missing modules
import { PhaseCard } from "./timeline/PhaseCard";

interface WorkflowTimelineProps {
  model: TimelineModel;
  projectId: string;
}

/**
 * Phase-grouped timeline displaying workflow execution history
 *
 * Shows only phase cards, each containing its own internal timeline.
 * Auto-scrolls to active phase on mount.
 *
 * Pipeline: buildTimelineModel() → groupTimelineByPhase() → render PhaseCards only
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
  if (grouped.phases.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No workflow execution history to display</p>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-4">
      {/* Phase cards only - no workflow-level events */}
      {/* @ts-ignore - phase type */}
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
