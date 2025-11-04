import { useState } from "react";
import type { StepTimelineItem } from "../../lib/timelineModel";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBody } from "./TimelineBody";
import { WorkflowStatusBadge } from "../WorkflowStatusBadge";
import { StepAnnotations } from "./StepAnnotations";
import { ArtifactList } from "../ArtifactList";
import { ErrorDisplay } from "../ErrorDisplay";
import { AgentSessionModal } from "../AgentSessionModal";
import {
  formatStepName,
  formatRelativeTime,
} from "../../utils/workflowFormatting";
import { ExternalLink, Workflow, MessageSquare } from "lucide-react";

export interface StepItemProps {
  item: StepTimelineItem;
  projectId: string;
}

/**
 * Workflow execution step timeline item
 * Shows step details, logs, errors, artifacts, and annotations
 *
 * All display properties (status, colors, badges, durations) are pre-computed
 * in the domain model. This component is a "dumb renderer" that consumes
 * the enriched StepTimelineItem data.
 */
export function StepItem({ item, projectId }: StepItemProps) {
  // Destructure pre-computed data from domain model
  const { step, metadata, display, debug, annotations, artifacts } = item;

  // Auto-expand for errors or running steps, expand for highlighted steps
  const [isExpanded, setIsExpanded] = useState(
    debug.hasError || display.isPulsing || display.isHighlighted
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [selectedSessionName, setSelectedSessionName] = useState<string | null>(
    null
  );

  const hasContent =
    display.hasLogs || debug.hasError || display.hasArtifacts || display.hasAnnotations || metadata.agentSessionId;

  const handleSessionClick = (sessionId: string, stepName: string) => {
    setSelectedSessionId(sessionId);
    setSelectedSessionName(stepName);
    setModalOpen(true);
  };

  return (
    <TimelineRow icon={Workflow} iconColor={display.iconColor}>
      <TimelineHeader
        title={formatStepName(metadata.name)}
        metadata={
          <>
            <span>{formatRelativeTime(metadata.startedAt)}</span>
            {metadata.duration && (
              <>
                <span>•</span>
                <span>{Math.floor(metadata.duration / 1000)}s</span>
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
        badge={<WorkflowStatusBadge status={display.status} size="sm" />}
        onClick={hasContent ? () => setIsExpanded(!isExpanded) : undefined}
        isExpandable={hasContent}
      />

      {hasContent && (
        <TimelineBody
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
        >
          <div className="space-y-3">
            {/* Agent session link */}
            {metadata.agentSessionId && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() =>
                    handleSessionClick(
                      metadata.agentSessionId!,
                      formatStepName(metadata.name)
                    )
                  }
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MessageSquare className="h-3 w-3" />
                  View Agent Session
                </button>

                {/* Fallback link for new tab */}
                <a
                  href={`/projects/${projectId}/session/${metadata.agentSessionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  <ExternalLink className="h-3 w-3 inline" />
                </a>
              </div>
            )}

            {/* Error message - always expanded for failed steps */}
            {debug.hasError && <ErrorDisplay error={debug.errorMessage!} expanded />}

            {/* Logs */}
            {display.hasLogs && (
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
            {display.hasArtifacts && <ArtifactList artifacts={artifacts} />}

            {/* Step annotations (pre-filtered for this step) */}
            {display.hasAnnotations && <StepAnnotations stepEvents={annotations} />}

            {/* Empty state */}
            {!display.hasLogs &&
              !debug.hasError &&
              !display.hasArtifacts &&
              !display.hasAnnotations &&
              !metadata.agentSessionId && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No additional details available
                </div>
              )}
          </div>
        </TimelineBody>
      )}

      {/* Agent Session Modal */}
      <AgentSessionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectId={projectId}
        sessionId={selectedSessionId}
        sessionName={selectedSessionName || undefined}
      />
    </TimelineRow>
  );
}
