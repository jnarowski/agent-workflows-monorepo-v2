/**
 * React Query hooks for git operations
 * Provides hooks for status, branches, diffs, commits, and PR operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/client/lib/api-client';
import type {
  GitStatus,
  GitBranch,
  GitCommit,
  GitCommitDiff,
  PrData,
  PrResult,
} from '@/shared/types/git.types';
import { toast } from 'sonner';

// Query hooks

/**
 * Fetch git status for a project
 * Auto-refreshes every 30 seconds
 */
export function useGitStatus(projectId: string | undefined) {
  return useQuery({
    queryKey: ['git', 'status', projectId],
    queryFn: async () => {
      const response = await api.get<{ data: GitStatus }>(
        `/api/projects/${projectId}/git/status`
      );
      return response.data;
    },
    enabled: !!projectId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Fetch all branches for a project
 */
export function useBranches(projectId: string | undefined) {
  return useQuery({
    queryKey: ['git', 'branches', projectId],
    queryFn: async () => {
      const response = await api.get<{ data: GitBranch[] }>(
        `/api/projects/${projectId}/git/branches`
      );
      return response.data;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch diff for a specific file
 */
export function useFileDiff(projectId: string | undefined, filepath: string | null) {
  return useQuery({
    queryKey: ['git', 'diff', projectId, filepath],
    queryFn: async () => {
      const response = await api.get<{ data: { diff: string } }>(
        `/api/projects/${projectId}/git/diff?path=${encodeURIComponent(filepath!)}`
      );
      return response.data.diff;
    },
    enabled: !!projectId && !!filepath,
  });
}

/**
 * Fetch commit history with pagination
 */
export function useCommitHistory(
  projectId: string | undefined,
  limit: number = 100,
  offset: number = 0
) {
  return useQuery({
    queryKey: ['git', 'history', projectId, limit, offset],
    queryFn: async () => {
      const response = await api.get<{ data: GitCommit[] }>(
        `/api/projects/${projectId}/git/history?limit=${limit}&offset=${offset}`
      );
      return response.data;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch diff for a specific commit
 */
export function useCommitDiff(projectId: string | undefined, commitHash: string | null) {
  return useQuery({
    queryKey: ['git', 'commit', projectId, commitHash],
    queryFn: async () => {
      const response = await api.get<{ data: GitCommitDiff }>(
        `/api/projects/${projectId}/git/commit/${commitHash}`
      );
      return response.data;
    },
    enabled: !!projectId && !!commitHash,
  });
}

/**
 * Fetch PR pre-fill data
 */
export function usePrData(
  projectId: string | undefined,
  baseBranch: string = 'main',
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ['git', 'pr-data', projectId, baseBranch],
    queryFn: async () => {
      const response = await api.get<{ data: PrData }>(
        `/api/projects/${projectId}/git/pr-data?base=${baseBranch}`
      );
      return response.data;
    },
    enabled: enabled && !!projectId,
  });
}

// Mutation hooks

/**
 * Create a new branch and switch to it
 */
export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      name,
      from,
    }: {
      projectId: string;
      name: string;
      from?: string;
    }) => {
      const response = await api.post<{ data: GitBranch }>(
        `/api/projects/${projectId}/git/branch`,
        { name, from }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'branches', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['git', 'status', variables.projectId] });
      toast.success(`Branch created: ${data.name}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create branch: ${error.message}`);
    },
  });
}

/**
 * Switch to an existing branch
 */
export function useSwitchBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, name }: { projectId: string; name: string }) => {
      const response = await api.post<{ data: GitBranch }>(
        `/api/projects/${projectId}/git/branch/switch`,
        { name }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'branches', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['git', 'status', variables.projectId] });
      toast.success(`Switched to branch: ${data.name}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to switch branch: ${error.message}`);
    },
  });
}

/**
 * Stage files
 */
export function useStageFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, files }: { projectId: string; files: string[] }) => {
      await api.post(`/api/projects/${projectId}/git/stage`, { files });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'status', variables.projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to stage files: ${error.message}`);
    },
  });
}

/**
 * Unstage files
 */
export function useUnstageFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, files }: { projectId: string; files: string[] }) => {
      await api.post(`/api/projects/${projectId}/git/unstage`, { files });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'status', variables.projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to unstage files: ${error.message}`);
    },
  });
}

/**
 * Commit changes
 */
export function useCommit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      message,
      files,
    }: {
      projectId: string;
      message: string;
      files: string[];
    }) => {
      const response = await api.post<{ data: { hash: string } }>(
        `/api/projects/${projectId}/git/commit`,
        { message, files }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'status', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['git', 'history', variables.projectId] });
      toast.success('Committed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to commit: ${error.message}`);
    },
  });
}

/**
 * Push to remote
 */
export function usePush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      branch,
      remote = 'origin',
    }: {
      projectId: string;
      branch: string;
      remote?: string;
    }) => {
      await api.post(`/api/projects/${projectId}/git/push`, { branch, remote });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'status', variables.projectId] });
      toast.success('Pushed to remote');
    },
    onError: (error: Error) => {
      toast.error(`Failed to push: ${error.message}`);
    },
  });
}

/**
 * Fetch from remote
 */
export function useFetch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      remote = 'origin',
    }: {
      projectId: string;
      remote?: string;
    }) => {
      await api.post(`/api/projects/${projectId}/git/fetch`, { remote });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'status', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['git', 'history', variables.projectId] });
      toast.success('Fetched from remote');
    },
    onError: (error: Error) => {
      toast.error(`Failed to fetch: ${error.message}`);
    },
  });
}

/**
 * Create pull request
 */
export function useCreatePr() {
  return useMutation({
    mutationFn: async ({
      projectId,
      title,
      description,
      baseBranch = 'main',
    }: {
      projectId: string;
      title: string;
      description: string;
      baseBranch?: string;
    }) => {
      const response = await api.post<{ data: PrResult }>(
        `/api/projects/${projectId}/git/pr`,
        { title, description, baseBranch }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.prUrl) {
        window.open(data.prUrl, '_blank');
      }

      const method = data.useGhCli ? 'GitHub CLI' : 'GitHub web';
      toast.success(`Pull request created via ${method}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create PR: ${error.message}`);
    },
  });
}
