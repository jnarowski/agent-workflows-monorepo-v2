import { useState } from "react";
import type { WorkflowExecutionStep, WorkflowEvent } from "../../types";
import { TimelineRow } from "./TimelineRow";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBody } from "./TimelineBody";
import { WorkflowStatusBadge } from "../WorkflowStatusBadge";
import { StepComments } from "./StepComments";
import { ArtifactList } from "../ArtifactList";
import { ErrorDisplay } from "../ErrorDisplay";
import { AgentSessionModal } from "../AgentSessionModal";
import {
  formatStepName,
  formatRelativeTime,
} from "../../utils/workflowFormatting";
import { ExternalLink, Workflow, MessageSquare } from "lucide-react";

export interface StepItemProps {
  step: WorkflowExecutionStep;
  projectId: string;
  stepEvents: WorkflowEvent[];
}

/**
 * Workflow execution step timeline item
 * Shows step details, logs, errors, artifacts, and comments
 */
export function StepItem({ step, projectId, stepEvents }: StepItemProps) {
  const [isExpanded, setIsExpanded] = useState(
    step.status === "running" || step.status === "failed"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [selectedSessionName, setSelectedSessionName] = useState<string | null>(
    null
  );

  const hasLogs = step.logs && step.logs.trim().length > 0;
  const hasError = step.error_message && step.error_message.trim().length > 0;
  const hasArtifacts = step.artifacts && step.artifacts.length > 0;
  const hasComments = stepEvents.length > 0;
  const hasContent =
    hasLogs || hasError || hasArtifacts || hasComments || step.agent_session_id;

  const handleSessionClick = (sessionId: string, stepName: string) => {
    setSelectedSessionId(sessionId);
    setSelectedSessionName(stepName);
    setModalOpen(true);
  };

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
    <TimelineRow icon={Workflow} iconColor="bg-primary text-primary-foreground">
      <TimelineHeader
        title={formatStepName(step.step_name)}
        metadata={
          <>
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
            {step.agent_session_id && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() =>
                    handleSessionClick(
                      step.agent_session_id!,
                      formatStepName(step.step_name)
                    )
                  }
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MessageSquare className="h-3 w-3" />
                  View Agent Session
                </button>

                {/* Fallback link for new tab */}
                <a
                  href={`/projects/${projectId}/session/${step.agent_session_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  <ExternalLink className="h-3 w-3 inline" />
                </a>
              </div>
            )}

            {/* Error message */}
            {hasError && <ErrorDisplay error={step.error_message!} />}

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
            {hasArtifacts && <ArtifactList artifacts={step.artifacts!} />}

            {/* Step comments */}
            <StepComments stepEvents={stepEvents} />

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
