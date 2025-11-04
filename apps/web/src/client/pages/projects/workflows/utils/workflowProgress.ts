import type { WorkflowExecution } from "../types";
import { StepStatus } from "@/shared/schemas";
import { isStepTerminal } from "./workflowStatus";
import { getExecutionMetrics } from "./executionMetrics";

/**
 * Calculate workflow progress as a percentage (0-100)
 * Based on current phase / total phases
 *
 * Example: 3 phases, on phase 2 → 2/3 = 67%
 *
 * @deprecated Use getExecutionMetrics(execution).phaseProgressPercentage instead
 */
export function calculateProgress(execution: WorkflowExecution): number {
  return getExecutionMetrics(execution).phaseProgressPercentage;
}

/**
 * Estimate time remaining for a workflow execution
 * Based on average step duration and remaining steps
 */
export function estimateTimeRemaining(execution: WorkflowExecution): string {
  const steps = execution.steps || [];

  if (steps.length === 0 || !execution.started_at) {
    return "Unknown";
  }

  // Filter completed steps with timing information
  const completedSteps = steps.filter(
    (step) =>
      step.status === StepStatus.COMPLETED &&
      step.started_at &&
      step.completed_at
  );

  if (completedSteps.length === 0) {
    return "Calculating...";
  }

  // Calculate average step duration
  const totalDuration = completedSteps.reduce((sum, step) => {
    const start = new Date(step.started_at!).getTime();
    const end = new Date(step.completed_at!).getTime();
    return sum + (end - start);
  }, 0);

  const avgStepDuration = totalDuration / completedSteps.length;

  // Count remaining steps
  const remainingSteps = steps.filter(
    (step) => step.status === StepStatus.PENDING
  ).length;

  const estimatedMs = avgStepDuration * remainingSteps;

  return formatDuration(estimatedMs);
}

/**
 * Format duration in milliseconds to human-readable string
 * Examples: "2m 34s", "1h 5m", "45s"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0s";

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
}

/**
 * Calculate the duration of a workflow execution
 */
export function calculateDuration(execution: WorkflowExecution): string {
  if (!execution.started_at) {
    return "Not started";
  }

  const startTime = new Date(execution.started_at).getTime();
  const endTime = execution.completed_at
    ? new Date(execution.completed_at).getTime()
    : Date.now();

  return formatDuration(endTime - startTime);
}

/**
 * Get the current phase progress (steps completed in current phase)
 */
export function getPhaseProgress(
  execution: WorkflowExecution,
  phaseName: string
): { completed: number; total: number; percentage: number } {
  const phaseSteps =
    execution.steps?.filter((step) => step.phase_name === phaseName) || [];

  const completed = phaseSteps.filter((step) =>
    isStepTerminal(step.status)
  ).length;

  const percentage =
    phaseSteps.length > 0
      ? Math.round((completed / phaseSteps.length) * 100)
      : 0;

  return {
    completed,
    total: phaseSteps.length,
    percentage,
  };
}
