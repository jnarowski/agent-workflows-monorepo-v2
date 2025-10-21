// Shared types between frontend and backend for type safety across the stack

export interface Project {
  id: string;
  name: string;
  path: string;
  claude_project_path: string | null;
  created_at: Date;
  updated_at: Date;
}

// Request/Response types for API endpoints
export interface CreateProjectRequest {
  name: string;
  path: string;
  claude_project_path?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  path?: string;
  claude_project_path?: string;
}

export interface ProjectResponse {
  data: Project;
}

export interface ProjectsResponse {
  data: Project[];
}

export interface ErrorResponse {
  error: string;
  message?: string;
}
