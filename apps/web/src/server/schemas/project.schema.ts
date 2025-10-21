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
});

// Schema for project ID parameter
export const projectIdSchema = z.object({
  id: z.string().cuid("Invalid project ID format"),
});

// Export types inferred from schemas
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectIdParam = z.infer<typeof projectIdSchema>;
