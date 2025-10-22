import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  FileTreeItem,
  FilesResponse,
  FileErrorResponse,
} from "@/shared/types/file.types";
import { useAuthStore } from "@/client/stores";
import { fetchWithAuth } from "@/client/lib/auth";

// Query keys factory - centralized key management
export const fileKeys = {
  all: ["files"] as const,
  projects: () => [...fileKeys.all, "project"] as const,
  project: (projectId: string) => [...fileKeys.projects(), projectId] as const,
};

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
  const handleInvalidToken = useAuthStore((s) => s.handleInvalidToken);

  return useQuery({
    queryKey: fileKeys.project(projectId),
    queryFn: () => fetchProjectFiles(projectId, handleInvalidToken),
    enabled: !!projectId, // Only run if projectId is provided
  });
}
