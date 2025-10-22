import { z } from "zod";

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
});

// Schema for project ID parameter
export const projectIdSchema = z.object({
  id: z.string().cuid("Invalid project ID format"),
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

// Export types inferred from schemas
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectIdParam = z.infer<typeof projectIdSchema>;
export type FileContentQuery = z.infer<typeof fileContentQuerySchema>;
export type FileContentBody = z.infer<typeof fileContentBodySchema>;
export type HideProjectInput = z.infer<typeof hideProjectSchema>;
