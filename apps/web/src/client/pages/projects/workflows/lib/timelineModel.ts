/**
 * Timeline Domain Model
 *
 * This module transforms raw database entities into an enriched domain model
 * optimized for timeline rendering. It pre-computes display properties,
 * pre-filters related data, and pre-identifies error states to eliminate
 * component-level filtering and computation.
 *
 * Key Design Decisions:
 * - Stateless transformation (useMemo, not Zustand)
 * - Immutable data structures
 * - Pre-computed everything (durations, statuses, display flags)
 * - Type-safe discriminated unions
 */

import type { LucideIcon } from 'lucide-react';
import type {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowEvent,
  WorkflowArtifact,
  StepStatus as BaseStepStatus,
  WorkflowStatus,
} from '../types';
import { getEventConfig } from './eventConfig';

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Step status with all possible states
 */
export type StepStatus = BaseStepStatus;

/**
 * Badge variant types matching shadcn/ui Badge component
 */
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Step annotation (immutable system note, not editable user comment)
 */
export interface StepAnnotation {
  id: string;
  text: string;
  created_at: Date;
  created_by_user_id: string | null;
  created_by_username?: string | null;
  artifacts: StepArtifact[]; // Artifacts attached to this annotation
}

/**
 * Step artifact reference
 */
export interface StepArtifact {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  created_at: Date;
}

// ============================================================================
// Timeline Item Types (Discriminated Union)
// ============================================================================

/**
 * Step timeline item with pre-computed metadata, display, and debug properties
 */
export interface StepTimelineItem {
  itemType: 'step';
  id: string;
  timestamp: Date;
  step: WorkflowExecutionStep;

  // Pre-attached related data
  annotations: StepAnnotation[];
  artifacts: StepArtifact[];

  // Pre-computed metadata
  metadata: {
    name: string;
    startedAt: Date;
    completedAt: Date | null;
    duration: number | null; // milliseconds
    agentSessionId: string | null;
  };

  // Pre-computed display properties
  display: {
    status: StepStatus;
    statusLabel: string;
    iconColor: string;
    badgeVariant: BadgeVariant;
    isHighlighted: boolean; // Error or current step
    isPulsing: boolean; // Currently running
    hasLogs: boolean;
    hasError: boolean;
    hasArtifacts: boolean;
    hasAnnotations: boolean;
  };

  // Debug-optimized properties
  debug: {
    hasError: boolean;
    errorMessage: string | null;
    isCurrent: boolean; // Currently executing step
  };
}

/**
 * Event timeline item with pre-computed display configuration
 */
export interface EventTimelineItem {
  itemType: 'event';
  id: string;
  timestamp: Date;
  event: WorkflowEvent;

  // Pre-computed metadata
  metadata: {
    title: string;
    body: string;
    scope: 'workflow' | 'phase' | 'step'; // Event scope
  };

  // Pre-computed display properties
  display: {
    icon: LucideIcon;
    iconColor: string;
    label: string;
    badgeVariant: BadgeVariant;
  };
}

/**
 * Standalone annotation item (not attached to a step)
 */
export interface AnnotationTimelineItem {
  itemType: 'annotation';
  id: string;
  timestamp: Date;
  event: WorkflowEvent;

  // Pre-computed metadata
  metadata: {
    text: string;
    created_by_user_id: string | null;
    created_by_username: string | null;
  };
}

/**
 * Discriminated union of all timeline item types
 */
export type TimelineItem = StepTimelineItem | EventTimelineItem | AnnotationTimelineItem;

// ============================================================================
// Summary and Live State Types
// ============================================================================

/**
 * Execution summary with aggregated statistics
 */
export interface ExecutionSummary {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  runningSteps: number;
  pendingSteps: number;
  skippedSteps: number;
  progressPercentage: number; // 0-100
  duration: number | null; // milliseconds (null if not completed)
  currentPhase: string | null;
  hasErrors: boolean;
  overallHealth: 'healthy' | 'warning' | 'critical';
}

/**
 * Live state for real-time updates
 */
export interface LiveState {
  isLive: boolean; // Execution is running
  runningStepIds: string[];
  avgStepDuration: number | null; // Average ms per step (for progress estimation)
}

/**
 * Complete timeline model (top-level domain object)
 */
export interface TimelineModel {
  execution: WorkflowExecution;
  items: TimelineItem[]; // Chronologically sorted
  summary: ExecutionSummary;
  liveState: LiveState;
}

// ============================================================================
// Builder Functions
// ============================================================================

/**
 * Build step timeline items with pre-computed properties
 */
function buildStepItems(
  steps: WorkflowExecutionStep[],
  annotations: WorkflowEvent[],
  artifacts: WorkflowArtifact[],
  execution: WorkflowExecution
): StepTimelineItem[] {
  // Only include steps that have started (filter out pending steps with no started_at)
  const startedSteps = steps.filter((step) => step.started_at !== null);

  return startedSteps.map((step) => {
    // Filter annotations for this step
    const stepAnnotations: StepAnnotation[] = annotations
      .filter((event) => event.workflow_execution_step_id === step.id)
      .map((event) => ({
        id: event.id,
        text: event.event_data?.body || '',
        created_at: event.created_at,
        created_by_user_id: event.created_by_user_id,
        created_by_username: event.created_by_user?.username || null,
        // Include artifacts attached to this annotation event
        artifacts: (event.artifacts || []).map((artifact) => ({
          id: artifact.id,
          name: artifact.file_name || artifact.name,
          file_path: artifact.file_path,
          file_type: artifact.file_type,
          mime_type: artifact.mime_type,
          size_bytes: artifact.size_bytes,
          created_at: artifact.created_at,
        })),
      }));

    // Collect artifact IDs that are already associated with annotations
    const annotationArtifactIds = new Set(
      stepAnnotations.flatMap((ann) => ann.artifacts.map((a) => a.id))
    );

    // Filter artifacts for this step (exclude ones already shown in annotations)
    const stepArtifacts: StepArtifact[] = artifacts
      .filter((artifact) =>
        artifact.workflow_execution_step_id === step.id &&
        !annotationArtifactIds.has(artifact.id)
      )
      .map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        file_path: artifact.file_path,
        file_type: artifact.file_type,
        mime_type: artifact.mime_type,
        size_bytes: artifact.size_bytes,
        created_at: artifact.created_at,
      }));

    // Compute metadata
    const startedAt = new Date(step.started_at!);
    const completedAt = step.completed_at ? new Date(step.completed_at) : null;
    const duration = completedAt ? completedAt.getTime() - startedAt.getTime() : null;

    // Determine status
    const status = determineStepStatus(step);

    // Compute display properties
    const hasError = !!step.error_message;
    const isCurrent = execution.current_step === step.step_name && execution.status === 'running';

    return {
      itemType: 'step' as const,
      id: step.id,
      timestamp: startedAt,
      step,
      annotations: stepAnnotations,
      artifacts: stepArtifacts,
      metadata: {
        name: step.step_name,
        startedAt,
        completedAt,
        duration,
        agentSessionId: step.agent_session_id,
      },
      display: {
        status,
        statusLabel: getStatusLabel(status),
        iconColor: getStepIconColor(status),
        badgeVariant: getStepBadgeVariant(status),
        isHighlighted: hasError || isCurrent,
        isPulsing: status === 'running',
        hasLogs: !!step.logs,
        hasError,
        hasArtifacts: stepArtifacts.length > 0,
        hasAnnotations: stepAnnotations.length > 0,
      },
      debug: {
        hasError,
        errorMessage: step.error_message,
        isCurrent,
      },
    };
  });
}

/**
 * Build event timeline items with pre-computed display config
 */
function buildEventItems(lifecycleEvents: WorkflowEvent[]): EventTimelineItem[] {
  return lifecycleEvents.map((event) => {
    const config = getEventConfig(event.event_type);
    const scope = getEventScope(event.event_type);

    return {
      itemType: 'event' as const,
      id: event.id,
      timestamp: new Date(event.created_at),
      event,
      metadata: {
        title: event.event_data?.title || event.event_type,
        body: event.event_data?.body || '',
        scope,
      },
      display: {
        icon: config.icon,
        iconColor: config.iconColor,
        label: config.label,
        badgeVariant: config.badgeVariant,
      },
    };
  });
}

/**
 * Build standalone annotation items (not attached to a step)
 */
function buildAnnotationItems(standaloneAnnotations: WorkflowEvent[]): AnnotationTimelineItem[] {
  return standaloneAnnotations.map((event) => ({
    itemType: 'annotation' as const,
    id: event.id,
    timestamp: new Date(event.created_at),
    event,
    metadata: {
      text: event.event_data?.body || '',
      created_by_user_id: event.created_by_user_id,
      created_by_username: event.created_by_user?.username || null,
    },
  }));
}

/**
 * Build execution summary with aggregated statistics
 */
function buildExecutionSummary(
  execution: WorkflowExecution,
  steps: WorkflowExecutionStep[],
  events: WorkflowEvent[]
): ExecutionSummary {
  // Count steps by status
  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const failedSteps = steps.filter((s) => s.status === 'failed').length;
  const runningSteps = steps.filter((s) => s.status === 'running').length;
  const pendingSteps = steps.filter((s) => s.status === 'pending').length;
  const skippedSteps = steps.filter((s) => s.status === 'skipped').length;

  // Calculate progress
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Calculate duration
  const duration =
    execution.started_at && execution.completed_at
      ? new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()
      : null;

  // Find current phase from latest phase_started event
  const phaseStartedEvents = events.filter((e) => e.event_type === 'phase_started');
  const latestPhaseEvent = phaseStartedEvents[phaseStartedEvents.length - 1];
  const currentPhase = latestPhaseEvent?.event_data?.phase || execution.current_phase;

  // Determine health
  const hasErrors = failedSteps > 0 || execution.status === 'failed';
  const overallHealth: 'healthy' | 'warning' | 'critical' =
    hasErrors ? 'critical' : execution.status === 'paused' ? 'warning' : 'healthy';

  return {
    totalSteps,
    completedSteps,
    failedSteps,
    runningSteps,
    pendingSteps,
    skippedSteps,
    progressPercentage,
    duration,
    currentPhase,
    hasErrors,
    overallHealth,
  };
}

/**
 * Build live state for real-time updates
 */
function buildLiveState(
  execution: WorkflowExecution,
  stepItems: StepTimelineItem[]
): LiveState {
  const isLive = execution.status === 'running';
  const runningStepIds = stepItems.filter((item) => item.display.status === 'running').map((item) => item.id);

  // Calculate average step duration from completed steps
  const completedSteps = stepItems.filter((item) => item.metadata.duration !== null);
  const avgStepDuration =
    completedSteps.length > 0
      ? completedSteps.reduce((sum, item) => sum + (item.metadata.duration || 0), 0) / completedSteps.length
      : null;

  return {
    isLive,
    runningStepIds,
    avgStepDuration,
  };
}

/**
 * Main builder function - transforms raw execution data into enriched timeline model
 */
export function buildTimelineModel(
  execution: WorkflowExecution,
  steps: WorkflowExecutionStep[],
  events: WorkflowEvent[],
  artifacts: WorkflowArtifact[]
): TimelineModel {
  // Separate annotation events from lifecycle events
  const annotationEvents = events.filter((e) => e.event_type === 'annotation_added');
  const lifecycleEvents = events.filter((e) => e.event_type !== 'annotation_added');

  // Further separate standalone annotations from step-attached ones
  const stepAnnotations = annotationEvents.filter((e) => e.workflow_execution_step_id !== null);
  const standaloneAnnotations = annotationEvents.filter((e) => e.workflow_execution_step_id === null);

  // Build timeline items
  const stepItems = buildStepItems(steps, stepAnnotations, artifacts, execution);
  const eventItems = buildEventItems(lifecycleEvents);
  const annotationItems = buildAnnotationItems(standaloneAnnotations);

  // Merge and sort chronologically
  const items: TimelineItem[] = [...stepItems, ...eventItems, ...annotationItems].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Build summary and live state
  const summary = buildExecutionSummary(execution, steps, events);
  const liveState = buildLiveState(execution, stepItems);

  return {
    execution,
    items,
    summary,
    liveState,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine step status based on database fields
 */
function determineStepStatus(step: WorkflowExecutionStep): StepStatus {
  // Check for error first (highest priority)
  if (step.error_message) {
    return 'failed';
  }

  // Use explicit status field
  return step.status;
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: StepStatus): string {
  const labels: Record<StepStatus, string> = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    skipped: 'Skipped',
  };

  return labels[status] || status;
}

/**
 * Get execution status label
 */
export function getExecutionStatusLabel(status: WorkflowStatus): string {
  const labels: Record<WorkflowStatus, string> = {
    pending: 'Pending',
    running: 'Running',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  return labels[status] || status;
}

/**
 * Get Tailwind icon color classes for step status
 */
function getStepIconColor(status: StepStatus): string {
  const colors: Record<StepStatus, string> = {
    pending: 'bg-gray-500 text-white',
    running: 'bg-blue-500 text-white',
    completed: 'bg-green-500 text-white',
    failed: 'bg-red-500 text-white',
    skipped: 'bg-gray-400 text-white',
  };

  return colors[status] || 'bg-gray-500 text-white';
}

/**
 * Get badge variant for step status
 */
function getStepBadgeVariant(status: StepStatus): BadgeVariant {
  const variants: Record<StepStatus, BadgeVariant> = {
    pending: 'outline',
    running: 'default',
    completed: 'default',
    failed: 'destructive',
    skipped: 'secondary',
  };

  return variants[status] || 'outline';
}

/**
 * Determine event scope based on event type
 */
function getEventScope(eventType: string): 'workflow' | 'phase' | 'step' {
  if (eventType.startsWith('workflow_')) {
    return 'workflow';
  }
  if (eventType.startsWith('phase_')) {
    return 'phase';
  }
  if (eventType.startsWith('step_')) {
    return 'step';
  }
  return 'workflow'; // Default fallback
}
