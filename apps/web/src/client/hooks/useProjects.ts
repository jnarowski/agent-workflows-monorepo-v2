import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsResponse,
  ProjectResponse,
  ErrorResponse,
} from "../../shared/types/project.types";
import { useAuth } from "../contexts/AuthContext";

// Query keys factory - centralized key management
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: () => [...projectKeys.lists()] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Helper to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

// Helper to make authenticated API calls
async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  onUnauthorized?: () => void
) {
  const token = getAuthToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - invalid or missing token
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
      throw new Error("Session expired");
    }

    const error: ErrorResponse = await response.json().catch(() => ({
      error: "An error occurred",
    }));
    throw new Error(error.error || "An error occurred");
  }

  return response.json();
}

/**
 * Fetch all projects
 */
async function fetchProjects(onUnauthorized?: () => void): Promise<Project[]> {
  const data: ProjectsResponse = await fetchWithAuth("/api/projects", {}, onUnauthorized);
  return data.data;
}

/**
 * Fetch a single project by ID
 */
async function fetchProject(id: string, onUnauthorized?: () => void): Promise<Project> {
  const data: ProjectResponse = await fetchWithAuth(`/api/projects/${id}`, {}, onUnauthorized);
  return data.data;
}

/**
 * Create a new project
 */
async function createProject(project: CreateProjectRequest, onUnauthorized?: () => void): Promise<Project> {
  const data: ProjectResponse = await fetchWithAuth("/api/projects", {
    method: "POST",
    body: JSON.stringify(project),
  }, onUnauthorized);
  return data.data;
}

/**
 * Update a project
 */
async function updateProject(id: string, project: UpdateProjectRequest, onUnauthorized?: () => void): Promise<Project> {
  const data: ProjectResponse = await fetchWithAuth(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(project),
  }, onUnauthorized);
  return data.data;
}

/**
 * Delete a project
 */
async function deleteProject(id: string, onUnauthorized?: () => void): Promise<Project> {
  const data: ProjectResponse = await fetchWithAuth(`/api/projects/${id}`, {
    method: "DELETE",
  }, onUnauthorized);
  return data.data;
}

/**
 * Hook to fetch all projects
 */
export function useProjects(): UseQueryResult<Project[], Error> {
  const { handleInvalidToken } = useAuth();

  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => fetchProjects(handleInvalidToken),
  });
}

/**
 * Hook to fetch a single project
 */
export function useProject(id: string): UseQueryResult<Project, Error> {
  const { handleInvalidToken } = useAuth();

  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProject(id, handleInvalidToken),
    enabled: !!id, // Only run if id is provided
  });
}

/**
 * Hook to create a new project
 */
export function useCreateProject(): UseMutationResult<
  Project,
  Error,
  CreateProjectRequest
> {
  const queryClient = useQueryClient();
  const { handleInvalidToken } = useAuth();

  return useMutation({
    mutationFn: (project) => createProject(project, handleInvalidToken),
    onSuccess: (newProject) => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      // Optionally add the new project to cache optimistically
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        return old ? [newProject, ...old] : [newProject];
      });

      toast.success("Project created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project");
    },
  });
}

/**
 * Hook to update a project
 */
export function useUpdateProject(): UseMutationResult<
  Project,
  Error,
  { id: string; data: UpdateProjectRequest }
> {
  const queryClient = useQueryClient();
  const { handleInvalidToken } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }) => updateProject(id, data, handleInvalidToken),
    onSuccess: (updatedProject) => {
      // Update the project in the list cache
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        if (!old) return [updatedProject];
        return old.map((project) =>
          project.id === updatedProject.id ? updatedProject : project
        );
      });

      // Update the individual project cache
      queryClient.setQueryData(
        projectKeys.detail(updatedProject.id),
        updatedProject
      );

      toast.success("Project updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project");
    },
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject(): UseMutationResult<
  Project,
  Error,
  string
> {
  const queryClient = useQueryClient();
  const { handleInvalidToken } = useAuth();

  return useMutation({
    mutationFn: (id) => deleteProject(id, handleInvalidToken),
    onSuccess: (deletedProject) => {
      // Remove the project from the list cache
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        if (!old) return [];
        return old.filter((project) => project.id !== deletedProject.id);
      });

      // Remove the individual project cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(deletedProject.id) });

      toast.success("Project deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });
}
