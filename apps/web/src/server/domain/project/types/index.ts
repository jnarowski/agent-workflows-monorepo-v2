// Project domain types
// Re-export shared types for convenience
export type {
  Project,
  ProjectWithSessions,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/shared/types/project.types";

// Internal service types (input types for service functions)
export interface CreateProjectInput {
  name: string;
  path: string;
}

export interface UpdateProjectInput {
  name?: string;
  path?: string;
  is_hidden?: boolean;
  is_starred?: boolean;
}

// Options for getAllProjects
export interface GetAllProjectsOptions {
  includeSessions?: boolean;
  sessionLimit?: number;
}
