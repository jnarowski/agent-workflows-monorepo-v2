/**
 * Type exports for workflow SDK
 */

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
} from "./steps";

export type {
  WorkflowConfig,
  WorkflowContext,
  WorkflowEventData,
  WorkflowFunction,
} from "./workflow";

export type { PhaseOptions as PhaseOptionsAlias } from "./phases";
