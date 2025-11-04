import { useState, useRef, useEffect, memo } from "react";
import type { PhaseGroup, TimelineItem } from "../../utils/groupTimelineByPhase";
import { StepItem } from "./StepItem";
import { EventItem } from "./EventItem";
import { EventAnnotationItem } from "./EventAnnotationItem";
import { WorkflowStatusBadge } from "../WorkflowStatusBadge";
import { formatRelativeTime } from "../../utils/workflowFormatting";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface PhaseCardProps {
  phase: PhaseGroup;
  projectId: string;
}

/**
 * Collapsible card component for rendering a phase and its nested timeline items
 *
 * Features:
 * - Auto-expands if phase status is 'running'
 * - Header: phase name, status badge, duration, chevron toggle icon
 * - Footer: completion timestamp, retry count (if > 0)
 * - Active phase: border-l-4 border-blue-500
 * - Smooth expand/collapse animation
 */
function PhaseCardComponent({ phase, projectId }: PhaseCardProps) {
  const { name, items, metadata } = phase;
  const { startedAt, completedAt, retryCount, status, duration } = metadata;

  // Auto-expand if phase is running
  const [isExpanded, setIsExpanded] = useState(status === "running");
  const cardRef = useRef<HTMLDivElement>(null);

  // Re-expand when phase becomes running (for live updates)
  useEffect(() => {
    if (status === "running" && !isExpanded) {
      setIsExpanded(true);
    }
  }, [status, isExpanded]);

  // Determine border color for active phase
  const borderColor = status === "running" ? "border-l-4 border-blue-500" : "border-l border-gray-200 dark:border-gray-800";

  return (
    <div
      ref={cardRef}
      className={`rounded-lg border bg-card text-card-foreground shadow-sm ${borderColor} overflow-hidden transition-all duration-200`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Chevron icon */}
          <div className="text-muted-foreground transition-transform duration-200" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(0deg)" }}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>

          {/* Phase name */}
          <h3 className="text-sm font-semibold capitalize">{name}</h3>

          {/* Status badge */}
          <WorkflowStatusBadge status={status} size="sm" />
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {startedAt && <span>{formatRelativeTime(startedAt)}</span>}
          {duration && (
            <>
              <span>•</span>
              <span>{Math.floor(duration / 1000)}s</span>
            </>
          )}
          {items.length > 0 && (
            <>
              <span>•</span>
              <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
            </>
          )}
        </div>
      </button>

      {/* Body (collapsible) */}
      <div
        className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="border-t border-gray-200 dark:border-gray-800 bg-muted/30">
          {/* Render nested timeline items */}
          <div className="space-y-2 p-4">
            {items.map((item) => (
              <div key={item.id}>{renderTimelineItem(item, projectId)}</div>
            ))}
          </div>

          {/* Footer */}
          {(completedAt || retryCount > 0) && (
            <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/50">
              <div className="flex items-center gap-2">
                {completedAt && (
                  <span>Completed {formatRelativeTime(completedAt)}</span>
                )}
              </div>
              {retryCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {retryCount} {retryCount === 1 ? "retry" : "retries"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Render appropriate component based on timeline item type
 */
function renderTimelineItem(item: TimelineItem, projectId: string) {
  switch (item.itemType) {
    case "step":
      return <StepItem item={item} projectId={projectId} />;
    case "event":
      return <EventItem item={item} />;
    case "annotation":
      return <EventAnnotationItem annotation={item} />;
    default: {
      // Exhaustive check
      const _exhaustive: never = item;
      void _exhaustive;
      return null;
    }
  }
}

export const PhaseCard = memo(PhaseCardComponent);
