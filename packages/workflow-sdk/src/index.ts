/**
 * @sourceborn/workflow-sdk - Type-safe workflow SDK for Sourceborn workflow engine
 *
 * This SDK provides TypeScript interfaces and builder functions for defining workflows.
 * The actual implementations are provided by the Sourceborn web app at runtime.
 *
 * @example
 * ```typescript
 * import { defineWorkflow } from '@sourceborn/workflow-sdk';
 *
 * export default defineWorkflow({
 *   id: 'my-workflow',
 *   trigger: 'workflow/my-workflow',
 *   phases: ['phase1', 'phase2']
 * }, async ({ event, step }) => {
 *   await step.phase('phase1', async () => {
 *     await step.agent('task', { agent: 'claude', prompt: 'Do something' });
 *   });
 * });
 * ```
 */

// Builder exports
export { defineWorkflow } from "./builder";
export type { WorkflowDefinition } from "./builder";

// Type exports
export type {
  WorkflowStep,
  StepOptions,
  PhaseOptions,
  AgentStepConfig,
  AgentStepResult,
  GitStepConfig,
  GitStepResult,
  CliStepConfig,
  CliStepResult,
  ArtifactStepConfig,
  ArtifactStepResult,
  WorkflowConfig,
  WorkflowContext,
  WorkflowEventData,
  WorkflowFunction,
} from "./types";

// Runtime exports
export type { WorkflowRuntime } from "./runtime";

// Package version
export const VERSION = "1.0.0";
