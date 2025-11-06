import type { JSONSchema7 } from "json-schema";
import type { WorkflowStep } from "./steps";

/**
 * Phase definition - can be a simple string (id = label) or object with separate id and label
 */
export type PhaseDefinition = string | { id: string; label: string };

/**
 * Extract phase IDs from phase definitions array
 * Handles both string arrays and object arrays with id property
 */
export type ExtractPhaseIds<T extends readonly PhaseDefinition[]> =
  T[number] extends string
    ? T[number]
    : T[number] extends { id: infer Id }
      ? Id
      : never;

/**
 * Workflow configuration
 */
export interface WorkflowConfig<
  TPhases extends readonly PhaseDefinition[] | undefined = undefined
> {
  /** Unique workflow identifier */
  id: string;
  /** Inngest event trigger name (e.g., "workflow/implement-feature") */
  trigger: string;
  /** Human-readable workflow name */
  name?: string;
  /** Workflow description */
  description?: string;
  /** Workflow phases (for UI organization) */
  phases?: TPhases;
  /** Global workflow timeout in milliseconds */
  timeout?: number;
  /**
   * JSON Schema for workflow arguments (runtime validation)
   */
  argsSchema?: JSONSchema7;
}

/**
 * Workflow execution context passed to workflow function
 */
export interface WorkflowContext<
  TPhases extends readonly PhaseDefinition[] | undefined = undefined
> {
  /** Inngest event data */
  event: {
    name: string;
    data: WorkflowEventData;
  };
  /** Extended step interface with custom methods */
  step: WorkflowStep<
    TPhases extends readonly PhaseDefinition[]
      ? ExtractPhaseIds<TPhases>
      : string
  >;
}

/**
 * Event data structure for workflow triggers
 */
export interface WorkflowEventData {
  /** Workflow execution ID */
  executionId: string;
  /** Project ID */
  projectId: string;
  /** User ID who triggered the workflow */
  userId: string;
  /** Project filesystem path */
  projectPath: string;
  /**
   * Workflow arguments
   */
  args: Record<string, unknown>;
}

/**
 * Workflow function signature
 */
export type WorkflowFunction<
  TPhases extends readonly PhaseDefinition[] | undefined = undefined
> = (
  context: WorkflowContext<TPhases>
) => Promise<unknown>;
