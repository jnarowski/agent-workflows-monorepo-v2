import type { PhaseDefinition } from '@repo/workflow-sdk';

/**
 * Extract phase ID from PhaseDefinition
 * @param phase - Phase definition (string or object)
 * @returns Phase ID
 */
export function getPhaseId(phase: PhaseDefinition): string {
  return typeof phase === 'string' ? phase : phase.id;
}

/**
 * Extract phase label from PhaseDefinition
 * @param phase - Phase definition (string or object)
 * @returns Phase label for display
 */
export function getPhaseLabel(phase: PhaseDefinition): string {
  return typeof phase === 'string' ? phase : phase.label;
}
