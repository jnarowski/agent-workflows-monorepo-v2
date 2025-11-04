/**
 * Phase Grouping Utility
 *
 * Transforms flat timeline model into phase-grouped structure for timeline display.
 * Separates workflow-level events from phase-scoped items and groups by phase.
 *
 * Key Design Decisions:
 * - Pure transformation function (no side effects)
 * - Input: TimelineModel (from buildTimelineModel)
 * - Output: PhaseGroupedTimeline with workflow events and phase groups
 * - Only includes started phases (skips pending phases)
 * - Phase metadata extracted from phase events (started, completed, retry)
 * - Phase status calculated from child step statuses
 */

import type { TimelineModel, TimelineItem, StepTimelineItem, EventTimelineItem, AnnotationTimelineItem } from './buildTimelineModel';

// ============================================================================
// Phase Grouping Types
// ============================================================================

/**
 * Phase status derived from child steps
 */
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Phase metadata extracted from phase events
 */
export interface PhaseMetadata {
  startedAt: Date | null;
  completedAt: Date | null;
  retryCount: number;
  status: PhaseStatus;
  duration: number | null; // milliseconds (null if not completed)
}

/**
 * Phase group with nested timeline items
 */
export interface PhaseGroup {
  name: string;
  items: TimelineItem[]; // Steps, events, annotations belonging to this phase
  metadata: PhaseMetadata;
}

/**
 * Phase-grouped timeline structure
 */
export interface PhaseGroupedTimeline {
  workflowEvents: TimelineItem[]; // Workflow-level events (shown outside phase cards)
  phases: PhaseGroup[]; // Phase groups with nested items
}

// ============================================================================
// Phase Grouping Logic
// ============================================================================

/**
 * Group timeline items by phase
 * Extracts workflow events and groups remaining items by phase field
 */
export function groupTimelineByPhase(model: TimelineModel): PhaseGroupedTimeline {
  const workflowEvents: TimelineItem[] = [];
  const phaseMap = new Map<string, TimelineItem[]>();

  // Separate workflow events from phase-scoped items
  for (const item of model.items) {
    if (item.itemType === 'event' && item.metadata.scope === 'workflow') {
      workflowEvents.push(item);
    } else {
      // Group by phase field
      const phase = getPhaseFromItem(item);
      if (phase) {
        if (!phaseMap.has(phase)) {
          phaseMap.set(phase, []);
        }
        phaseMap.get(phase)!.push(item);
      }
    }
  }

  // Build phase groups with metadata
  const phases: PhaseGroup[] = [];
  for (const [phaseName, items] of phaseMap.entries()) {
    const metadata = extractPhaseMetadata(phaseName, items, model.execution.current_phase);
    phases.push({
      name: phaseName,
      items,
      metadata,
    });
  }

  // Sort phases chronologically by start time
  phases.sort((a, b) => {
    if (!a.metadata.startedAt) return 1;
    if (!b.metadata.startedAt) return -1;
    return a.metadata.startedAt.getTime() - b.metadata.startedAt.getTime();
  });

  return {
    workflowEvents,
    phases,
  };
}

/**
 * Extract phase name from timeline item
 */
function getPhaseFromItem(item: TimelineItem): string | null {
  switch (item.itemType) {
    case 'step':
      return item.step.phase;
    case 'event':
      // Extract phase from event_data if scope is phase or step
      if (item.metadata.scope === 'phase' || item.metadata.scope === 'step') {
        // Phase events have phase in event_data
        const eventData = item.event.event_data as Record<string, unknown>;
        return (eventData.phase as string) ?? null;
      }
      return null;
    case 'annotation':
      // Annotations attached to steps inherit their phase
      // For now, we'll skip standalone annotations (future enhancement)
      return null;
  }
}

/**
 * Extract phase metadata from phase events and child steps
 */
function extractPhaseMetadata(
  phaseName: string,
  items: TimelineItem[],
  currentPhase: string | null
): PhaseMetadata {
  let startedAt: Date | null = null;
  let completedAt: Date | null = null;
  let retryCount = 0;

  // Extract metadata from phase events
  for (const item of items) {
    if (item.itemType === 'event') {
      const eventData = item.event.event_data as Record<string, unknown>;
      const eventPhase = eventData.phase as string;

      if (eventPhase === phaseName) {
        switch (item.event.event_type) {
          case 'phase_started':
            if (!startedAt || item.timestamp < startedAt) {
              startedAt = item.timestamp;
            }
            break;
          case 'phase_completed':
            if (!completedAt || item.timestamp > completedAt) {
              completedAt = item.timestamp;
            }
            break;
          case 'phase_retry':
            retryCount++;
            break;
        }
      }
    }
  }

  // Calculate phase status from child steps
  const status = calculatePhaseStatus(items, phaseName, currentPhase);

  // Calculate duration
  const duration =
    startedAt && completedAt
      ? completedAt.getTime() - startedAt.getTime()
      : null;

  return {
    startedAt,
    completedAt,
    retryCount,
    status,
    duration,
  };
}

/**
 * Calculate phase status from child step statuses
 * Priority:
 * 1. If any step failed → phase status = 'failed'
 * 2. If all steps completed → phase status = 'completed'
 * 3. If any step running or phase is current → phase status = 'running'
 * 4. Otherwise → phase status = 'pending'
 */
function calculatePhaseStatus(
  items: TimelineItem[],
  phaseName: string,
  currentPhase: string | null
): PhaseStatus {
  const steps = items.filter((item): item is StepTimelineItem => item.itemType === 'step');

  if (steps.length === 0) {
    return 'pending';
  }

  // Check for failed steps
  const hasFailed = steps.some((step) => step.display.status === 'failed');
  if (hasFailed) {
    return 'failed';
  }

  // Check for running steps or if this is the current phase
  const hasRunning = steps.some((step) => step.display.status === 'running');
  if (hasRunning || currentPhase === phaseName) {
    return 'running';
  }

  // Check if all steps completed
  const allCompleted = steps.every((step) => step.display.status === 'completed');
  if (allCompleted) {
    return 'completed';
  }

  return 'pending';
}

// Re-export model types for convenience
export type { TimelineModel, TimelineItem, StepTimelineItem, EventTimelineItem, AnnotationTimelineItem };
