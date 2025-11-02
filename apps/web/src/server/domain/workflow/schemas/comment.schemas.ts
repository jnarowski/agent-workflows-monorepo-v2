import { z } from 'zod';

// Comment type enum
export const commentTypeSchema = z.enum(['user', 'system', 'agent']);

// Create comment request schema
export const createCommentSchema = z.object({
  text: z.string().min(1),
  step_id: z.string().cuid().optional(),
  comment_type: commentTypeSchema.optional().default('user'),
});

// Get comments query params schema
export const getCommentsQuerySchema = z.object({
  step_id: z.string().cuid().optional(),
});

// Comment response schema
export const commentResponseSchema = z.object({
  id: z.string(),
  workflow_execution_id: z.string(),
  workflow_execution_step_id: z.string().nullable(),
  text: z.string(),
  comment_type: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
