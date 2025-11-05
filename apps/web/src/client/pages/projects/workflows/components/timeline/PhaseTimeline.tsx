import { useMemo } from "react";
import { PhaseCard } from "./PhaseCard";
import type {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowEvent,
  WorkflowArtifact,
} from "../../types";

interface PhaseTimelineProps {
  execution: WorkflowExecution;
  projectId: string;
}

interface PhaseGroup {
  phaseName: string;
  steps: WorkflowExecutionStep[];
  events: WorkflowEvent[];
  artifacts: WorkflowArtifact[];
}

export function PhaseTimeline({ execution, projectId }: PhaseTimelineProps) {
  // Group data by phase
  const phaseGroups = useMemo((): PhaseGroup[] => {
    const phases = execution.workflow_definition?.phases || [];
    const steps = execution.steps || [];
    const events = execution.events || [];
    const artifacts = execution.artifacts || [];

    return phases.map((phase) => {
      // Phase can be either a string or an object with name property
      const phaseName = typeof phase === 'string' ? phase : phase.name;

      // Filter steps for this phase
      const phaseSteps = steps.filter((step) => step.phase === phaseName);

      // Filter events for this phase (includes lifecycle + annotations)
      const phaseEvents = events.filter((event) => {
        // Phase-level lifecycle events
        if (
          [
            "phase_started",
            "phase_completed",
            "phase_retry",
            "phase_failed",
          ].includes(event.event_type)
        ) {
          return event.event_data?.phase === phaseName;
        }

        // Step-level lifecycle events (match by step's phase)
        if (
          [
            "step_started",
            "step_running",
            "step_completed",
            "step_failed",
          ].includes(event.event_type)
        ) {
          const eventStepId = event.event_data?.stepId || event.event_data?.step_id;
          if (eventStepId) {
            const step = phaseSteps.find((s) => s.id === eventStepId);
            return !!step;
          }
        }

        // Annotations - match by phase column
        if (event.event_type === "annotation_added") {
          return event.phase === phaseName;
        }

        return false;
      });

      // Filter artifacts for this phase using the phase column
      const phaseArtifacts = artifacts.filter(
        (artifact) => artifact.phase === phaseName
      );

      return {
        phaseName,
        steps: phaseSteps,
        events: phaseEvents,
        artifacts: phaseArtifacts,
      };
    });
  }, [execution]);

  if (!execution.workflow_definition?.phases) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No phases defined for this workflow
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {phaseGroups.map((group) => (
        <PhaseCard
          key={group.phaseName}
          phaseName={group.phaseName}
          steps={group.steps}
          events={group.events}
          artifacts={group.artifacts}
          currentPhase={execution.current_phase}
          projectId={projectId}
        />
      ))}
    </div>
  );
}
