import { z } from 'zod';

/**
 * Zod Schemas for Workflow WebSocket Messages
 *
 * Provides runtime validation and type-safe contracts for workflow events.
 * Use these schemas in development mode to catch message format errors early.
 *
 * Pattern: Discriminated union by `type` field for exhaustive type checking
 */

// ============================================================================
// Base Schema
// ============================================================================

/**
 * Common fields present in all workflow event messages
 */
const BaseWorkflowMessageSchema = z.object({
  type: z.string(),
  executionId: z.string(),
  projectId: z.string(),
  timestamp: z.string(),
});

// ============================================================================
// Workflow Lifecycle Event Schemas
// ============================================================================

/**
 * Workflow started event
 * Emitted when workflow execution begins
 */
const WorkflowStartedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:started'),
});

/**
 * Workflow completed event
 * Emitted when workflow execution finishes successfully
 */
const WorkflowCompletedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:completed'),
});

/**
 * Workflow failed event
 * Emitted when workflow execution fails with error
 */
const WorkflowFailedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:failed'),
  data: z.object({
    error: z.string(),
  }),
});

/**
 * Workflow paused event
 * Emitted when workflow execution is paused
 */
const WorkflowPausedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:paused'),
});

/**
 * Workflow resumed event
 * Emitted when paused workflow execution resumes
 */
const WorkflowResumedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:resumed'),
});

/**
 * Workflow cancelled event
 * Emitted when workflow execution is cancelled by user
 */
const WorkflowCancelledSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:cancelled'),
});

// ============================================================================
// Step Event Schemas
// ============================================================================

/**
 * Step started event
 * Emitted when a workflow step begins execution
 */
const WorkflowStepStartedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:step:started'),
  data: z.object({
    stepId: z.string(),
    stepName: z.string(),
    phase: z.string().optional(),
  }),
});

/**
 * Step completed event
 * Emitted when a workflow step finishes successfully
 */
const WorkflowStepCompletedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:step:completed'),
  data: z.object({
    stepId: z.string(),
    stepName: z.string(),
    phase: z.string().optional(),
    logs: z.string().optional(),
    duration: z.number().optional(),
  }),
});

/**
 * Step failed event
 * Emitted when a workflow step fails with error
 */
const WorkflowStepFailedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:step:failed'),
  data: z.object({
    stepId: z.string(),
    stepName: z.string(),
    phase: z.string().optional(),
    error: z.string(),
    retryCount: z.number().optional(),
  }),
});

// ============================================================================
// Phase Event Schemas
// ============================================================================

/**
 * Phase started event
 * Emitted when a workflow phase begins
 */
const WorkflowPhaseStartedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:phase:started'),
  data: z.object({
    phaseName: z.string(),
    phaseIndex: z.number(),
  }),
});

/**
 * Phase completed event
 * Emitted when a workflow phase completes
 */
const WorkflowPhaseCompletedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:phase:completed'),
  data: z.object({
    phaseName: z.string(),
    phaseIndex: z.number(),
  }),
});

// ============================================================================
// Annotation Event Schema
// ============================================================================

/**
 * Annotation created event
 * Emitted when a comment/annotation is added to workflow execution
 */
const WorkflowAnnotationCreatedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:annotation:created'),
  data: z.object({
    commentId: z.string(),
    text: z.string(),
    body: z.string().optional(), // Alternative field name
    stepId: z.string().optional(), // Optional step association
    userId: z.string().nullable(),
  }),
});

// ============================================================================
// Discriminated Union
// ============================================================================

/**
 * Complete discriminated union of all workflow event message types
 *
 * Use this schema for validation:
 * ```typescript
 * const message = WorkflowWebSocketMessageSchema.parse(rawMessage);
 * ```
 *
 * Enables exhaustive type checking with TypeScript's never type:
 * ```typescript
 * switch (message.type) {
 *   case 'workflow:started': // ...
 *   case 'workflow:completed': // ...
 *   default:
 *     const _exhaustive: never = message; // TypeScript error if missing case
 * }
 * ```
 */
export const WorkflowWebSocketMessageSchema = z.discriminatedUnion('type', [
  WorkflowStartedSchema,
  WorkflowCompletedSchema,
  WorkflowFailedSchema,
  WorkflowPausedSchema,
  WorkflowResumedSchema,
  WorkflowCancelledSchema,
  WorkflowStepStartedSchema,
  WorkflowStepCompletedSchema,
  WorkflowStepFailedSchema,
  WorkflowPhaseStartedSchema,
  WorkflowPhaseCompletedSchema,
  WorkflowAnnotationCreatedSchema,
]);

/**
 * TypeScript type inferred from schema
 * Use this for type annotations in frontend and backend
 */
export type WorkflowWebSocketMessage = z.infer<typeof WorkflowWebSocketMessageSchema>;

/**
 * Validate a workflow WebSocket message (development helper)
 *
 * @param message - Raw message object to validate
 * @returns Validated message or throws ZodError
 *
 * @example
 * ```typescript
 * try {
 *   const validatedMessage = validateWorkflowMessage(rawMessage);
 *   // Process validatedMessage safely
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Invalid message format:', error.issues);
 *   }
 * }
 * ```
 */
export function validateWorkflowMessage(message: unknown): WorkflowWebSocketMessage {
  return WorkflowWebSocketMessageSchema.parse(message);
}
