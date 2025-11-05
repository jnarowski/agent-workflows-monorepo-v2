import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StepRow } from "./StepRow";
import { ArtifactRow } from "./ArtifactRow";
import { EventRow } from "./EventRow";
import type {
  WorkflowExecutionStep,
  WorkflowEvent,
  WorkflowArtifact,
} from "../../types";

interface PhaseCardProps {
  phaseName: string;
  steps: WorkflowExecutionStep[];
  events: WorkflowEvent[];
  artifacts: WorkflowArtifact[];
  currentPhase: string | null;
  projectId: string;
}

type PhaseStatus = "pending" | "running" | "completed" | "failed";

interface PhaseMetadata {
  status: PhaseStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  retryCount: number;
  duration: number | null;
}

export function PhaseCard({
  phaseName,
  steps,
  events,
  artifacts,
  currentPhase,
  projectId,
}: PhaseCardProps) {
  // Only expand if this is the current phase
  const [isExpanded, setIsExpanded] = useState(phaseName === currentPhase);

  // Calculate phase status and metadata
  const metadata = useMemo((): PhaseMetadata => {
    let status: PhaseStatus = "pending";
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;
    let retryCount = 0;

    // Extract metadata from events
    for (const event of events) {
      if (
        event.event_type === "phase_started" &&
        event.event_data?.phase === phaseName
      ) {
        startedAt = new Date(event.created_at);
      } else if (
        event.event_type === "phase_completed" &&
        event.event_data?.phase === phaseName
      ) {
        completedAt = new Date(event.created_at);
      } else if (
        event.event_type === "phase_retry" &&
        event.event_data?.phase === phaseName
      ) {
        retryCount++;
      }
    }

    // Calculate status from steps
    const stepStatuses = steps.map((s) => s.status);
    if (stepStatuses.some((s) => s === "failed")) {
      status = "failed";
    } else if (stepStatuses.every((s) => s === "completed")) {
      status = "completed";
    } else if (
      stepStatuses.some((s) => s === "running") ||
      currentPhase === phaseName
    ) {
      status = "running";
    } else {
      status = "pending";
    }

    // Calculate duration
    const duration =
      startedAt && completedAt
        ? completedAt.getTime() - startedAt.getTime()
        : null;

    return {
      status,
      startedAt,
      completedAt,
      retryCount,
      duration,
    };
  }, [steps, events, phaseName, currentPhase]);

  // Combine and sort timeline items by created_at ASC (oldest first)
  const timelineItems = useMemo(() => {
    const items: Array<
      | { type: "step"; data: WorkflowExecutionStep }
      | { type: "artifact"; data: WorkflowArtifact }
      | { type: "event"; data: WorkflowEvent }
    > = [];

    // Add steps
    steps.forEach((step) => {
      items.push({ type: "step", data: step });
    });

    // Add phase-level artifacts
    artifacts.forEach((artifact) => {
      items.push({ type: "artifact", data: artifact });
    });

    // Add lifecycle and annotation events
    events.forEach((event) => {
      const isLifecycle = [
        "phase_started",
        "phase_completed",
        "phase_retry",
        "phase_failed",
        "step_started",
        "step_running",
        "step_completed",
        "step_failed",
      ].includes(event.event_type);
      const isAnnotation = event.event_type === "annotation_added";

      if (isLifecycle || isAnnotation) {
        items.push({ type: "event", data: event });
      }
    });

    // Sort by created_at ASC (oldest first)
    items.sort((a, b) => {
      const aTime = new Date(a.data.created_at).getTime();
      const bTime = new Date(b.data.created_at).getTime();
      return aTime - bTime;
    });

    return items;
  }, [steps, artifacts, events]);

  // Status badge color
  const statusColor = {
    pending: "bg-gray-500",
    running: "bg-blue-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
  }[metadata.status];

  // Format duration
  const formatDuration = (ms: number | null) => {
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="border rounded-lg bg-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}

          <h3 className="text-lg font-semibold">{phaseName}</h3>

          <span
            className={`px-2 py-1 text-xs font-medium text-white rounded ${statusColor}`}
          >
            {metadata.status}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {metadata.retryCount > 0 && (
            <span>Retries: {metadata.retryCount}</span>
          )}
          {metadata.duration && (
            <span>Duration: {formatDuration(metadata.duration)}</span>
          )}
          <span>{timelineItems.length} items</span>
        </div>
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="border-t">
          {timelineItems.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No activity yet
            </div>
          ) : (
            <div className="divide-y">
              {timelineItems.map((item, index) => (
                <div key={`${item.type}-${item.data.id}-${index}`}>
                  {item.type === "step" && (
                    <StepRow step={item.data} projectId={projectId} />
                  )}
                  {item.type === "artifact" && (
                    <ArtifactRow artifact={item.data} />
                  )}
                  {item.type === "event" && <EventRow event={item.data} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
