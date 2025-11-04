/**
 * WebSocket Update Applier
 *
 * Applies incremental updates to cached WorkflowExecution data using immutable patterns.
 * This avoids full query invalidation and enables efficient React re-renders.
 *
 * Key Design Decisions:
 * - Single entry point: applyWorkflowUpdate()
 * - Discriminated union for type safety
 * - Returns new execution object (immutable)
 * - O(1) for most updates (only changed fields updated)
 */

import type {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowEvent,
  WorkflowArtifact,
} from "../types";

// ============================================================================
// Update Type Definitions (Discriminated Union)
// ============================================================================

/**
 * Workflow status changed (completed, failed, etc.)
 */
export interface WorkflowStatusUpdate {
  type: "workflow_status_updated";
  status: WorkflowExecution["status"];
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * Step started execution
 */
export interface StepStartedUpdate {
  type: "step_started";
  stepId: string;
  startedAt: Date;
  stepName: string;
}

/**
 * Step data updated (partial merge)
 */
export interface StepUpdatedUpdate {
  type: "step_updated";
  stepId: string;
  updates: Partial<WorkflowExecutionStep>;
}

/**
 * Step completed successfully
 */
export interface StepCompletedUpdate {
  type: "step_completed";
  stepId: string;
  completedAt: Date;
  logs?: string;
}

/**
 * Step failed with error
 */
export interface StepFailedUpdate {
  type: "step_failed";
  stepId: string;
  completedAt: Date;
  errorMessage: string;
  logs?: string;
}

/**
 * New event added to timeline
 */
export interface EventAddedUpdate {
  type: "event_added";
  event: WorkflowEvent;
}

/**
 * Annotation (comment) added
 */
export interface AnnotationAddedUpdate {
  type: "annotation_added";
  annotationId: string;
  text: string;
  stepId?: string; // Optional: attached to specific step
  userId: string | null;
  createdAt: Date;
}

/**
 * Artifact uploaded
 */
export interface ArtifactUploadedUpdate {
  type: "artifact_uploaded";
  artifact: WorkflowArtifact;
}

/**
 * Discriminated union of all update types
 */
export type WebSocketUpdate =
  | WorkflowStatusUpdate
  | StepStartedUpdate
  | StepUpdatedUpdate
  | StepCompletedUpdate
  | StepFailedUpdate
  | EventAddedUpdate
  | AnnotationAddedUpdate
  | ArtifactUploadedUpdate;

// ============================================================================
// Update Handler Functions
// ============================================================================

/**
 * Apply workflow status update
 */
function applyWorkflowStatusUpdate(
  execution: WorkflowExecution,
  update: WorkflowStatusUpdate
): WorkflowExecution {
  return {
    ...execution,
    status: update.status,
    completed_at: update.completedAt || execution.completed_at,
    error_message: update.errorMessage || execution.error_message,
    updated_at: new Date(),
  };
}

/**
 * Apply step started update
 * Creates a new step_started event and updates step status
 */
function applyStepStarted(
  execution: WorkflowExecution,
  update: StepStartedUpdate
): WorkflowExecution {
  // Update step status and started_at
  const updatedSteps =
    execution.steps?.map((step) =>
      step.id === update.stepId
        ? {
            ...step,
            status: "running" as const,
            started_at: update.startedAt,
            updated_at: new Date(),
          }
        : step
    ) || [];

  // Create step_started event
  const stepStartedEvent: WorkflowEvent = {
    id: `event-${Date.now()}-${Math.random()}`, // Temp ID until server confirms
    workflow_execution_id: execution.id,
    workflow_execution_step_id: update.stepId,
    event_type: "step_started",
    event_data: {
      title: `Step Started: ${update.stepName}`,
      body: `Step "${update.stepName}" has started execution`,
      step_id: update.stepId,
      step_name: update.stepName,
    },
    created_by_user_id: null,
    created_at: update.startedAt,
  };

  return {
    ...execution,
    steps: updatedSteps,
    events: [...(execution.events || []), stepStartedEvent],
    current_step: update.stepName,
    updated_at: new Date(),
  };
}

/**
 * Apply step updated (partial merge)
 */
function applyStepUpdated(
  execution: WorkflowExecution,
  update: StepUpdatedUpdate
): WorkflowExecution {
  const updatedSteps =
    execution.steps?.map((step) =>
      step.id === update.stepId
        ? {
            ...step,
            ...update.updates,
            updated_at: new Date(),
          }
        : step
    ) || [];

  return {
    ...execution,
    steps: updatedSteps,
    updated_at: new Date(),
  };
}

/**
 * Apply step completed update
 */
function applyStepCompleted(
  execution: WorkflowExecution,
  update: StepCompletedUpdate
): WorkflowExecution {
  const updatedSteps =
    execution.steps?.map((step) =>
      step.id === update.stepId
        ? {
            ...step,
            status: "completed" as const,
            completed_at: update.completedAt,
            logs: update.logs || step.logs,
            updated_at: new Date(),
          }
        : step
    ) || [];

  return {
    ...execution,
    steps: updatedSteps,
    updated_at: new Date(),
  };
}

/**
 * Apply step failed update
 */
function applyStepFailed(
  execution: WorkflowExecution,
  update: StepFailedUpdate
): WorkflowExecution {
  const updatedSteps =
    execution.steps?.map((step) =>
      step.id === update.stepId
        ? {
            ...step,
            status: "failed" as const,
            completed_at: update.completedAt,
            error_message: update.errorMessage,
            logs: update.logs || step.logs,
            updated_at: new Date(),
          }
        : step
    ) || [];

  return {
    ...execution,
    steps: updatedSteps,
    updated_at: new Date(),
  };
}

/**
 * Apply event added update
 */
function applyEventAdded(
  execution: WorkflowExecution,
  update: EventAddedUpdate
): WorkflowExecution {
  return {
    ...execution,
    events: [...(execution.events || []), update.event],
    updated_at: new Date(),
  };
}

/**
 * Apply annotation added update
 * Creates a new annotation_added event
 */
function applyAnnotationAdded(
  execution: WorkflowExecution,
  update: AnnotationAddedUpdate
): WorkflowExecution {
  const annotationEvent: WorkflowEvent = {
    id: update.annotationId,
    workflow_execution_id: execution.id,
    workflow_execution_step_id: update.stepId || null,
    event_type: "annotation_added",
    event_data: {
      title: "Annotation Added",
      body: update.text,
    },
    created_by_user_id: update.userId,
    created_at: update.createdAt,
  };

  return {
    ...execution,
    events: [...(execution.events || []), annotationEvent],
    updated_at: new Date(),
  };
}

/**
 * Apply artifact uploaded update
 */
function applyArtifactUploaded(
  execution: WorkflowExecution,
  update: ArtifactUploadedUpdate
): WorkflowExecution {
  return {
    ...execution,
    artifacts: [...(execution.artifacts || []), update.artifact],
    updated_at: new Date(),
  };
}

// ============================================================================
// Main Dispatcher
// ============================================================================

/**
 * Apply WebSocket update to execution data
 *
 * Main entry point for all incremental updates. Uses discriminated union
 * to route to appropriate handler function.
 *
 * @param execution - Current execution data
 * @param update - WebSocket update to apply
 * @returns New execution object with update applied (immutable)
 */
export function applyWorkflowUpdate(
  execution: WorkflowExecution,
  update: WebSocketUpdate
): WorkflowExecution {
  switch (update.type) {
    case "workflow_status_updated":
      return applyWorkflowStatusUpdate(execution, update);

    case "step_started":
      return applyStepStarted(execution, update);

    case "step_updated":
      return applyStepUpdated(execution, update);

    case "step_completed":
      return applyStepCompleted(execution, update);

    case "step_failed":
      return applyStepFailed(execution, update);

    case "event_added":
      return applyEventAdded(execution, update);

    case "annotation_added":
      return applyAnnotationAdded(execution, update);

    case "artifact_uploaded":
      return applyArtifactUploaded(execution, update);

    default:
      // TypeScript exhaustiveness check - if we get here, a new update type was added
      // but not handled in the switch statement
      console.warn("Unknown update type:", update);
      return execution; // Return unchanged
  }
}
