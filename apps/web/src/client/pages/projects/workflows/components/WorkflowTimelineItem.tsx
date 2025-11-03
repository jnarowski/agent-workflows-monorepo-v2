import { useState } from "react";
import type { WorkflowExecutionStep, WorkflowEvent } from "../types";
import { WorkflowStatusBadge } from "./WorkflowStatusBadge";
import { WorkflowTimelineCommentItem } from "./WorkflowTimelineCommentItem";
import { WorkflowTimelineItemHeader } from "./WorkflowTimelineItemHeader";
import {
  formatStepName,
  formatRelativeTime,
} from "../utils/workflowFormatting";
import { Badge } from "@/client/components/ui/badge";
import {
  ExternalLink,
  FileText,
  Clock,
  PlayCircle,
  CheckCircle,
  XCircle,
  PauseCircle,
  Ban,
  RefreshCw,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface WorkflowTimelineItemProps {
  item: {
    type: "step" | "event";
    data: WorkflowExecutionStep | WorkflowEvent;
  };
  stepEvents?: WorkflowEvent[];
}

/**
 * Unified timeline item component for both steps and events
 */
export function WorkflowTimelineItem({
  item,
  stepEvents = [],
}: WorkflowTimelineItemProps) {
  if (item.type === "step") {
    return (
      <StepItem
        step={item.data as WorkflowExecutionStep}
        stepEvents={stepEvents}
      />
    );
  }

  return <EventItem event={item.data as WorkflowEvent} />;
}

/**
 * Step timeline item
 */
function StepItem({
  step,
  stepEvents,
}: {
  step: WorkflowExecutionStep;
  stepEvents: WorkflowEvent[];
}) {
  const [isExpanded, setIsExpanded] = useState(
    step.status === "running" || step.status === "failed"
  );

  const hasLogs = step.logs && step.logs.trim().length > 0;
  const hasError = step.error_message && step.error_message.trim().length > 0;
  const hasArtifacts = step.artifacts && step.artifacts.length > 0;
  const hasComments = stepEvents.length > 0;

  const getDuration = () => {
    if (step.completed_at && step.started_at) {
      const duration =
        new Date(step.completed_at).getTime() -
        new Date(step.started_at).getTime();
      const seconds = Math.floor(duration / 1000);
      return `${seconds}s`;
    }
    return null;
  };

  const getTimeDisplay = () => {
    if (step.started_at) {
      return formatRelativeTime(step.started_at);
    }
    return "Not started";
  };

  return (
    <div className="relative pl-7">
      {/* Timeline Icon */}
      <div className="absolute left-0 -translate-x-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-8 ring-background">
        <FileText className="h-5 w-5" />
      </div>

      {/* Content */}
      <WorkflowTimelineItemHeader
        title={formatStepName(step.step_name)}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        metadata={
          <>
            <span>Step {step.step_number}</span>
            <span>•</span>
            <span>{getTimeDisplay()}</span>
            {getDuration() && (
              <>
                <span>•</span>
                <span>{getDuration()}</span>
              </>
            )}
            {step.phase_name && (
              <>
                <span>•</span>
                <span>{step.phase_name}</span>
              </>
            )}
          </>
        }
        badge={<WorkflowStatusBadge status={step.status} size="sm" />}
      >
        {/* Expanded content */}
        <div className="space-y-3">
            {/* Agent session link */}
            {step.agent_session_id && (
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`/sessions/${step.agent_session_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View agent session
                </a>
              </div>
            )}

            {/* Error message */}
            {hasError && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive mb-1">
                  Error
                </p>
                <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">
                  {step.error_message}
                </pre>
              </div>
            )}

            {/* Logs */}
            {hasLogs && (
              <div>
                <p className="text-sm font-medium mb-2">Logs</p>
                <div className="rounded-md bg-muted p-3 max-h-64 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90">
                    {step.logs}
                  </pre>
                </div>
              </div>
            )}

            {/* Artifacts */}
            {hasArtifacts && (
              <div>
                <p className="text-sm font-medium mb-2">Artifacts</p>
                <div className="space-y-2">
                  {step.artifacts?.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">
                        {artifact.file_name}
                      </span>
                      <button
                        onClick={() => {
                          window.open(
                            `/api/artifacts/${artifact.id}/download`,
                            "_blank"
                          );
                        }}
                        className="text-primary hover:underline text-xs"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step comments */}
            {hasComments && (
              <div>
                <p className="text-sm font-medium mb-2">Comments</p>
                <div className="space-y-2">
                  {stepEvents.map((event) => (
                    <WorkflowTimelineCommentItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

          {/* Empty state */}
          {!hasLogs &&
            !hasError &&
            !hasArtifacts &&
            !hasComments &&
            !step.agent_session_id && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No additional details available
              </div>
            )}
        </div>
      </WorkflowTimelineItemHeader>
    </div>
  );
}

/**
 * Event timeline item
 */
function EventItem({ event }: { event: WorkflowEvent }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Comment events are handled by WorkflowTimelineCommentItem
  if (event.event_type === "comment_added") {
    return (
      <div className="relative pl-10">
        {/* Timeline Icon */}
        <div className="absolute left-0 -translate-x-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-accent ring-8 ring-background">
          <Clock className="h-5 w-5" />
        </div>
        <WorkflowTimelineCommentItem event={event} />
      </div>
    );
  }

  const { icon: Icon, label, variant, description } = getEventDisplay(event);
  const hasExpandableContent = description && description.length > 0;

  return (
    <div className="relative pl-10">
      {/* Timeline Icon */}
      <div
        className={`absolute left-0 -translate-x-1/2 h-9 w-9 flex items-center justify-center rounded-full ring-8 ring-background ${getEventBgColor(
          event.event_type
        )}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      {hasExpandableContent ? (
        <WorkflowTimelineItemHeader
          title={getEventTitle(event)}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
          metadata={<span>{formatRelativeTime(event.created_at)}</span>}
          badge={
            <Badge variant={variant} className="rounded-full text-xs">
              {label}
            </Badge>
          }
        >
          {/* Expanded content */}
          <div className="space-y-3">
            {/* Description */}
            {description && (
              <p className="text-sm text-muted-foreground text-pretty">
                {description}
              </p>
            )}

            {/* Event Data (if any additional metadata) */}
            {renderEventData(event)}
          </div>
        </WorkflowTimelineItemHeader>
      ) : (
        <div className="pt-2 sm:pt-1 space-y-2">
          {/* Title */}
          <h3 className="text-base font-semibold">{getEventTitle(event)}</h3>

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{formatRelativeTime(event.created_at)}</span>
          </div>

          {/* Event Type Badge */}
          <div className="mt-2">
            <Badge variant={variant} className="rounded-full text-xs">
              {label}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get display properties for each event type
 */
function getEventDisplay(event: WorkflowEvent): {
  icon: LucideIcon;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  description?: string;
} {
  switch (event.event_type) {
    case "workflow_started":
      return {
        icon: PlayCircle,
        label: "Workflow",
        variant: "default",
      };

    case "workflow_completed":
      return {
        icon: CheckCircle,
        label: "Workflow",
        variant: "default",
      };

    case "workflow_failed": {
      const data = event.event_data as { error_message?: string };
      return {
        icon: XCircle,
        label: "Workflow",
        variant: "destructive",
        description: data.error_message,
      };
    }

    case "workflow_paused": {
      const data = event.event_data as { user_id?: string; reason?: string };
      return {
        icon: PauseCircle,
        label: "Workflow",
        variant: "secondary",
        description: data.reason,
      };
    }

    case "workflow_resumed":
      return {
        icon: RefreshCw,
        label: "Workflow",
        variant: "default",
      };

    case "workflow_cancelled": {
      const data = event.event_data as { user_id?: string; reason?: string };
      return {
        icon: Ban,
        label: "Workflow",
        variant: "destructive",
        description: data.reason,
      };
    }

    case "phase_started": {
      const data = event.event_data as { phase_name: string };
      return {
        icon: Layers,
        label: "Phase",
        variant: "outline",
        description: data.phase_name,
      };
    }

    case "phase_completed": {
      const data = event.event_data as { phase_name: string };
      return {
        icon: Layers,
        label: "Phase",
        variant: "outline",
        description: data.phase_name,
      };
    }

    case "step_started": {
      const data = event.event_data as { step_id: string; step_name: string };
      return {
        icon: PlayCircle,
        label: "Step",
        variant: "outline",
        description: data.step_name,
      };
    }

    default:
      return {
        icon: Clock,
        label: "Event",
        variant: "outline",
      };
  }
}

/**
 * Get timeline icon background color based on event type
 */
function getEventBgColor(eventType: string): string {
  switch (eventType) {
    case "workflow_started":
    case "workflow_resumed":
      return "bg-primary text-primary-foreground";
    case "workflow_completed":
      return "bg-green-500 text-white";
    case "workflow_failed":
    case "workflow_cancelled":
      return "bg-destructive text-destructive-foreground";
    case "workflow_paused":
      return "bg-yellow-500 text-white";
    case "phase_started":
    case "phase_completed":
      return "bg-blue-500 text-white";
    case "step_started":
      return "bg-purple-500 text-white";
    default:
      return "bg-accent";
  }
}

/**
 * Get human-readable title for event
 */
function getEventTitle(event: WorkflowEvent): string {
  switch (event.event_type) {
    case "workflow_started":
      return "Workflow Started";
    case "workflow_completed":
      return "Workflow Completed Successfully";
    case "workflow_failed":
      return "Workflow Failed";
    case "workflow_paused":
      return "Workflow Paused";
    case "workflow_resumed":
      return "Workflow Resumed";
    case "workflow_cancelled":
      return "Workflow Cancelled";
    case "phase_started": {
      const data = event.event_data as { phase_name: string };
      return `Phase "${data.phase_name}" Started`;
    }
    case "phase_completed": {
      const data = event.event_data as { phase_name: string };
      return `Phase "${data.phase_name}" Completed`;
    }
    case "step_started": {
      const data = event.event_data as { step_name: string };
      return `Step "${data.step_name}" Started`;
    }
    default:
      return "Event";
  }
}

/**
 * Render additional event data as badges
 */
function renderEventData(event: WorkflowEvent): JSX.Element | null {
  const data = event.event_data as Record<string, unknown>;

  const excludedKeys = [
    "phase_name",
    "step_name",
    "error_message",
    "reason",
    "user_id",
  ];
  const additionalData = Object.entries(data || {}).filter(
    ([key]) => !excludedKeys.includes(key)
  );

  if (additionalData.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {additionalData.map(([key, value]) => (
        <Badge key={key} variant="secondary" className="rounded-full">
          {key}: {String(value)}
        </Badge>
      ))}
    </div>
  );
}
