import { z } from "zod";
import { sessionResponseSchema } from "@/server/domain/session/schemas";

// ============================================================================
// Request Schemas
// ============================================================================

// Schema for creating a new project
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  path: z.string().min(1, "Project path is required"),
});

// Schema for updating a project
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  path: z.string().min(1).optional(),
  is_hidden: z.boolean().optional(),
  is_starred: z.boolean().optional(),
});

// Schema for project ID parameter
export const projectIdSchema = z.object({
  id: z.cuid("Invalid project ID format"),
});

// Schema for file content query parameters
export const fileContentQuerySchema = z.object({
  path: z.string().min(1, "File path is required"),
});

// Schema for file content request body
export const fileContentBodySchema = z.object({
  path: z.string().min(1, "File path is required"),
  content: z.string(),
});

// Schema for hiding/unhiding a project
export const hideProjectSchema = z.object({
  is_hidden: z.boolean(),
});

// Schema for starring/unstarring a project
export const starProjectSchema = z.object({
  is_starred: z.boolean(),
});

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Project schema
 *
 * Basic project information returned in responses
 */
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  is_hidden: z.boolean(),
  is_starred: z.boolean(),
  created_at: z.coerce.date(), // Coerce ISO strings to Date objects
  updated_at: z.coerce.date(), // Coerce ISO strings to Date objects
  current_branch: z.string().optional(),
});

/**
 * Single project response wrapper
 */
export const projectResponseSchema = z.object({
  data: projectSchema,
});

/**
 * Multiple projects response wrapper
 */
export const projectsResponseSchema = z.object({
  data: z.array(projectSchema),
});

/**
 * Project with sessions schema
 *
 * Includes nested session data
 */
export const projectWithSessionsSchema = projectSchema.extend({
  sessions: z.array(sessionResponseSchema),
});

/**
 * Multiple projects with sessions response wrapper
 */
export const projectsWithSessionsResponseSchema = z.object({
  data: z.array(projectWithSessionsSchema),
});

/**
 * Project sync result schema
 *
 * Returns statistics about project import/sync operation
 */
export const projectSyncResultSchema = z.object({
  projectsImported: z.number(),
  projectsUpdated: z.number(),
  totalSessionsSynced: z.number(),
});

/**
 * Project sync response wrapper
 */
export const projectSyncResponseSchema = z.object({
  data: projectSyncResultSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

// Export types inferred from schemas
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectIdParam = z.infer<typeof projectIdSchema>;
export type FileContentQuery = z.infer<typeof fileContentQuerySchema>;
export type FileContentBody = z.infer<typeof fileContentBodySchema>;
export type HideProjectInput = z.infer<typeof hideProjectSchema>;
export type StarProjectInput = z.infer<typeof starProjectSchema>;
