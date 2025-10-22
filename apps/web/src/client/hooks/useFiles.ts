import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  FileTreeItem,
  FilesResponse,
  FileErrorResponse,
} from "../../shared/types/file.types";
import { useAuth } from "../contexts/AuthContext";

// Query keys factory - centralized key management
export const fileKeys = {
  all: ["files"] as const,
  projects: () => [...fileKeys.all, "project"] as const,
  project: (projectId: string) => [...fileKeys.projects(), projectId] as const,
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

    const error: FileErrorResponse = await response.json().catch(() => ({
      error: "An error occurred",
    }));
    throw new Error(error.error || "An error occurred");
  }

  return response.json();
}

/**
 * Fetch file tree for a project
 */
async function fetchProjectFiles(projectId: string, onUnauthorized?: () => void): Promise<FileTreeItem[]> {
  const data: FilesResponse = await fetchWithAuth(`/api/projects/${projectId}/files`, {}, onUnauthorized);
  return data.data;
}

/**
 * Hook to fetch file tree for a project
 */
export function useProjectFiles(projectId: string): UseQueryResult<FileTreeItem[], Error> {
  const { handleInvalidToken } = useAuth();

  return useQuery({
    queryKey: fileKeys.project(projectId),
    queryFn: () => fetchProjectFiles(projectId, handleInvalidToken),
    enabled: !!projectId, // Only run if projectId is provided
  });
}
