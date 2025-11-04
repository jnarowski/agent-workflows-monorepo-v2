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
// Workflow Lifecycle Event Schemas
// ============================================================================

/**
 * Workflow created event
 * Emitted when workflow execution is created
 */
const WorkflowCreatedSchema = z.object({
  type: z.literal('workflow:created'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    definitionId: z.string(),
  }),
});

/**
 * Workflow started event
 * Emitted when workflow execution begins
 */
const WorkflowStartedSchema = z.object({
  type: z.literal('workflow:started'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Workflow completed event
 * Emitted when workflow execution finishes successfully
 */
const WorkflowCompletedSchema = z.object({
  type: z.literal('workflow:completed'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Workflow failed event
 * Emitted when workflow execution fails with error
 */
const WorkflowFailedSchema = z.object({
  type: z.literal('workflow:failed'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    error: z.string(),
  }),
});

/**
 * Workflow paused event
 * Emitted when workflow execution is paused
 */
const WorkflowPausedSchema = z.object({
  type: z.literal('workflow:paused'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Workflow resumed event
 * Emitted when paused workflow execution resumes
 */
const WorkflowResumedSchema = z.object({
  type: z.literal('workflow:resumed'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Workflow cancelled event
 * Emitted when workflow execution is cancelled by user
 */
const WorkflowCancelledSchema = z.object({
  type: z.literal('workflow:cancelled'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

// ============================================================================
// Step Event Schemas
// ============================================================================

/**
 * Step started event
 * Emitted when a workflow step begins execution
 */
const WorkflowStepStartedSchema = z.object({
  type: z.literal('workflow:step:started'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    stepId: z.string(),
    stepName: z.string(),
    phase: z.string(),
  }),
});

/**
 * Step completed event
 * Emitted when a workflow step finishes successfully
 */
const WorkflowStepCompletedSchema = z.object({
  type: z.literal('workflow:step:completed'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    stepId: z.string(),
    stepName: z.string(),
    phase: z.string(),
    logs: z.string(),
  }),
});

/**
 * Step failed event
 * Emitted when a workflow step fails with error
 */
const WorkflowStepFailedSchema = z.object({
  type: z.literal('workflow:step:failed'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    stepId: z.string(),
    stepName: z.string(),
    phase: z.string(),
    error: z.string(),
  }),
});

// ============================================================================
// Phase Event Schemas
// ============================================================================

/**
 * Phase started event
 * Emitted when a workflow phase begins
 */
const WorkflowPhaseStartedSchema = z.object({
  type: z.literal('workflow:phase:started'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    phase: z.string(),
  }),
});

/**
 * Phase completed event
 * Emitted when a workflow phase completes
 */
const WorkflowPhaseCompletedSchema = z.object({
  type: z.literal('workflow:phase:completed'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    phase: z.string(),
  }),
});

// ============================================================================
// Annotation Event Schema
// ============================================================================

/**
 * Annotation created event
 * Emitted when a comment/annotation is added to workflow execution
 */
const WorkflowAnnotationCreatedSchema = z.object({
  type: z.literal('workflow:annotation:created'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    commentId: z.string(),
    text: z.string(),
    body: z.string().optional(),
    stepId: z.string().optional(),
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
  WorkflowCreatedSchema,
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
