import type { WorkflowExecution } from "../types";

/**
 * Execution metrics for display in UI components
 */
export interface ExecutionMetrics {
  /** Current phase number (1-indexed). 0 if not started. */
  currentPhaseNumber: number;
  /** Total number of phases in workflow definition */
  totalPhases: number;
  /** Total actions (steps + events) */
  totalActions: number;
  /** Phase progress as percentage (0-100) */
  phaseProgressPercentage: number;
}

/**
 * Calculate all execution metrics for display
 *
 * @param execution - Workflow execution with definition and counts
 * @returns Metrics object with phase progress, counts, and percentages
 *
 * @example
 * const { currentPhaseNumber, totalPhases } = getExecutionMetrics(execution);
 * // Shows: "1 / 3 phases"
 */
export function getExecutionMetrics(
  execution: WorkflowExecution
): ExecutionMetrics {
  // Get phases from workflow definition
  const phases = execution.workflow_definition?.phases || [];
  const totalPhases = phases.length;

  // Calculate current phase number (1-indexed)
  let currentPhaseNumber = 0;
  if (execution.current_phase) {
    const currentPhaseIndex = phases.findIndex(
      (phase) => phase.name === execution.current_phase
    );
    if (currentPhaseIndex !== -1) {
      currentPhaseNumber = currentPhaseIndex + 1;
    }
  }

  // Calculate phase progress percentage
  const phaseProgressPercentage =
    totalPhases > 0 && currentPhaseNumber > 0
      ? Math.round((currentPhaseNumber / totalPhases) * 100)
      : 0;

  // Count total actions (steps + events)
  const totalActions =
    (execution._count?.steps || 0) + (execution._count?.events || 0);

  return {
    currentPhaseNumber,
    totalPhases,
    totalActions,
    phaseProgressPercentage,
  };
}
