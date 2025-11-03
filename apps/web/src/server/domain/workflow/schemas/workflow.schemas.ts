import { z } from 'zod';

// Workflow status enum
export const workflowStatusSchema = z.enum([
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
]);

// Step status enum
export const stepStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
]);

// Create workflow execution request schema
export const createWorkflowExecutionSchema = z.object({
  project_id: z.string().cuid(),
  workflow_definition_id: z.string().cuid(),
  name: z.string().min(1).max(200),
  args: z.record(z.string(), z.any()).default({}),
});

// Workflow execution filters schema
export const workflowExecutionFiltersSchema = z.object({
  project_id: z.string().cuid().optional(),
  status: workflowStatusSchema.optional(),
});

// Workflow execution response schema
export const workflowExecutionResponseSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  user_id: z.string(),
  workflow_definition_id: z.string(),
  name: z.string(),
  args: z.record(z.unknown()),
  current_phase: z.string().nullable(),
  current_step_index: z.number(),
  status: z.string(),
  error_message: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  paused_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
