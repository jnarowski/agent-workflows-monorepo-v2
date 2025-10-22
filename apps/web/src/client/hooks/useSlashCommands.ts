import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SlashCommand } from '@/shared/types/slash-command.types';
import { DEFAULT_SLASH_COMMANDS } from '@/client/lib/slashCommandUtils';
import { useAuthStore } from '@/client/stores';
import { fetchWithAuth } from '@/client/lib/auth';

// Query keys factory
export const slashCommandKeys = {
  all: ['slash-commands'] as const,
  projects: () => [...slashCommandKeys.all, 'project'] as const,
  project: (projectId: string) =>
    [...slashCommandKeys.projects(), projectId] as const,
};

/**
 * Fetch custom slash commands for a project
 */
async function fetchProjectSlashCommands(
  projectId: string,
  onUnauthorized?: () => void
): Promise<SlashCommand[]> {
  const response = await fetchWithAuth(
    `/api/projects/${projectId}/slash-commands`,
    {},
    onUnauthorized
  );
  return response.data;
}

/**
 * Hook to fetch and merge slash commands (built-in + custom)
 * @param projectId - Project ID (optional)
 * @returns Query result with merged commands
 */
export function useSlashCommands(
  projectId: string | undefined
): UseQueryResult<SlashCommand[], Error> {
  const handleInvalidToken = useAuthStore((s) => s.handleInvalidToken);

  return useQuery({
    queryKey: slashCommandKeys.project(projectId || ''),
    queryFn: async () => {
      if (!projectId) {
        // No project selected - return only default commands
        return DEFAULT_SLASH_COMMANDS;
      }

      try {
        // Fetch custom commands from API
        const customCommands = await fetchProjectSlashCommands(
          projectId,
          handleInvalidToken
        );

        // Merge default + custom commands
        return [...DEFAULT_SLASH_COMMANDS, ...customCommands];
      } catch (error) {
        console.error('Error fetching slash commands:', error);
        // On error, return only default commands
        return DEFAULT_SLASH_COMMANDS;
      }
    },
    enabled: true, // Always enabled - will return defaults even without projectId
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });
}
