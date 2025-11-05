/**
 * Pure state update functions for workflow store
 *
 * All functions are pure - they accept state, return new state, no side effects.
 * Used by Zustand store to keep handlers thin and logic testable.
 */

import type {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowEvent,
} from "../types";
import { WorkflowStatusValues, StepStatusValues } from "@/shared/schemas/workflow.schemas";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Immutably update an execution in a Map
 *
 * @param executions - Current executions Map
 * @param id - Execution ID to update
 * @param updater - Function that returns updated execution
 * @returns New Map with updated execution
 */
export function updateExecutionInMap(
  executions: Map<string, WorkflowExecution>,
  id: string,
  updater: (exec: WorkflowExecution) => WorkflowExecution
): Map<string, WorkflowExecution> {
  const execution = executions.get(id);
  if (!execution) return executions;

  const newExecutions = new Map(executions);
  newExecutions.set(id, updater(execution));
  return newExecutions;
}

/**
 * Immutably update a step within an execution
 *
 * @param execution - Current execution
 * @param stepId - Step ID to update
 * @param updates - Partial step updates
 * @returns New execution with updated step
 */
export function updateStepInExecution(
  execution: WorkflowExecution,
  stepId: string,
  updates: Partial<WorkflowExecutionStep>
): WorkflowExecution {
  if (!execution.steps) return execution;

  return {
    ...execution,
    steps: execution.steps.map((step) =>
      step.id === stepId
        ? { ...step, ...updates, updated_at: new Date() }
        : step
    ),
    updated_at: new Date(),
  };
}

// ============================================================================
// Workflow Status Update Functions
// ============================================================================

/**
 * Apply workflow started event
 */
export function applyWorkflowStarted(
  execution: WorkflowExecution
): WorkflowExecution {
  return {
    ...execution,
    status: WorkflowStatusValues.RUNNING,
    started_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Apply workflow completed event
 */
export function applyWorkflowCompleted(
  execution: WorkflowExecution
): WorkflowExecution {
  return {
    ...execution,
    status: WorkflowStatusValues.COMPLETED,
    completed_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Apply workflow failed event
 */
export function applyWorkflowFailed(
  execution: WorkflowExecution,
  error: string
): WorkflowExecution {
  return {
    ...execution,
    status: WorkflowStatusValues.FAILED,
    error_message: error,
    completed_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Apply workflow paused event
 */
export function applyWorkflowPaused(
  execution: WorkflowExecution
): WorkflowExecution {
  return {
    ...execution,
    status: WorkflowStatusValues.PAUSED,
    updated_at: new Date(),
  };
}

/**
 * Apply workflow resumed event
 */
export function applyWorkflowResumed(
  execution: WorkflowExecution
): WorkflowExecution {
  return {
    ...execution,
    status: WorkflowStatusValues.RUNNING,
    updated_at: new Date(),
  };
}

/**
 * Apply workflow cancelled event
 */
export function applyWorkflowCancelled(
  execution: WorkflowExecution
): WorkflowExecution {
  return {
    ...execution,
    status: WorkflowStatusValues.CANCELLED,
    completed_at: new Date(),
    updated_at: new Date(),
  };
}

// ============================================================================
// Step Update Functions
// ============================================================================

/**
 * Apply step started event
 */
export function applyStepStarted(
  execution: WorkflowExecution,
  event: {
    stepId: string;
    stepName: string;
    phaseId: string;
  }
): WorkflowExecution {
  const updatedExec = {
    ...execution,
    current_step: event.stepName,
    current_phase: event.phaseId,
    updated_at: new Date(),
  };

  // Update step status if steps are loaded
  if (execution.steps) {
    return updateStepInExecution(updatedExec, event.stepId, {
      status: StepStatusValues.RUNNING,
      started_at: new Date(),
    });
  }

  return updatedExec;
}

/**
 * Apply step completed event
 */
export function applyStepCompleted(
  execution: WorkflowExecution,
  event: {
    stepId: string;
    logs: string;
  }
): WorkflowExecution {
  if (!execution.steps) return execution;

  return updateStepInExecution(execution, event.stepId, {
    status: StepStatusValues.COMPLETED,
    logs: event.logs,
    completed_at: new Date(),
  });
}

/**
 * Apply step failed event
 */
export function applyStepFailed(
  execution: WorkflowExecution,
  event: {
    stepId: string;
    error: string;
  }
): WorkflowExecution {
  if (!execution.steps) return execution;

  return updateStepInExecution(execution, event.stepId, {
    status: StepStatusValues.FAILED,
    error_message: event.error,
    completed_at: new Date(),
  });
}

/**
 * Apply phase completed event
 */
export function applyPhaseCompleted(
  execution: WorkflowExecution,
  nextPhase: string | null
): WorkflowExecution {
  return {
    ...execution,
    current_phase: nextPhase,
    updated_at: new Date(),
  };
}

// ============================================================================
// Other Update Functions
// ============================================================================

/**
 * Apply event created (e.g., annotation_added)
 */
export function applyEventCreated(
  execution: WorkflowExecution,
  event: WorkflowEvent
): WorkflowExecution {
  return {
    ...execution,
    events: execution.events ? [...execution.events, event] : [event],
    updated_at: new Date(),
  };
}
