import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ReactNode } from 'react';
import {
  useGitStatus,
  useBranches,
  useFileDiff,
  useCommitHistory,
  useCommitDiff,
  usePrData,
  useCreateBranch,
  useSwitchBranch,
  useStageFiles,
  useUnstageFiles,
  useCommit,
  usePush,
  useFetch,
  useCreatePr,
} from './useGitOperations';
import * as apiClient from '@/client/lib/api-client';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/client/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useGitOperations hooks', () => {
  let queryClient: QueryClient;
  let wrapper: (props: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Create wrapper component with QueryClientProvider
    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Query Hooks', () => {
    describe('useGitStatus', () => {
      it('should fetch git status successfully', async () => {
        const mockStatus = {
          branch: 'main',
          files: [{ path: 'test.txt', status: 'M', staged: false }],
          ahead: 0,
          behind: 0,
          isRepo: true,
        };

        vi.mocked(apiClient.api.get).mockResolvedValue({ data: mockStatus });

        const { result } = renderHook(() => useGitStatus('project-123'), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockStatus);
        expect(apiClient.api.get).toHaveBeenCalledWith('/api/projects/project-123/git/status');
      });

      it('should not fetch when projectId is undefined', () => {
        const { result } = renderHook(() => useGitStatus(undefined), { wrapper });

        expect(result.current.data).toBeUndefined();
        expect(apiClient.api.get).not.toHaveBeenCalled();
      });
    });

    describe('useBranches', () => {
      it('should fetch branches successfully', async () => {
        const mockBranches = [
          { name: 'main', current: true },
          { name: 'develop', current: false },
        ];

        vi.mocked(apiClient.api.get).mockResolvedValue({ data: mockBranches });

        const { result } = renderHook(() => useBranches('project-123'), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockBranches);
        expect(apiClient.api.get).toHaveBeenCalledWith('/api/projects/project-123/git/branches');
      });
    });

    describe('useFileDiff', () => {
      it('should fetch file diff when filepath is provided', async () => {
        const mockDiff = '+++ added line\n--- removed line';

        vi.mocked(apiClient.api.get).mockResolvedValue({ data: { diff: mockDiff } });

        const { result } = renderHook(
          () => useFileDiff('project-123', 'test.txt'),
          { wrapper }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockDiff);
        expect(apiClient.api.get).toHaveBeenCalledWith(
          '/api/projects/project-123/git/diff?path=test.txt'
        );
      });

      it('should not fetch when filepath is null', () => {
        const { result } = renderHook(() => useFileDiff('project-123', null), { wrapper });

        expect(result.current.data).toBeUndefined();
        expect(apiClient.api.get).not.toHaveBeenCalled();
      });
    });

    describe('useCommitHistory', () => {
      it('should fetch commit history with default parameters', async () => {
        const mockCommits = [
          {
            hash: 'abc123',
            shortHash: 'abc123',
            message: 'Test commit',
            author: 'John Doe',
            email: 'john@example.com',
            date: '2024-01-01',
            relativeDate: '1 day ago',
          },
        ];

        vi.mocked(apiClient.api.get).mockResolvedValue({ data: mockCommits });

        const { result } = renderHook(() => useCommitHistory('project-123'), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockCommits);
        expect(apiClient.api.get).toHaveBeenCalledWith(
          '/api/projects/project-123/git/history?limit=100&offset=0'
        );
      });

      it('should fetch commit history with custom parameters', async () => {
        vi.mocked(apiClient.api.get).mockResolvedValue({ data: [] });

        const { result } = renderHook(
          () => useCommitHistory('project-123', 50, 10),
          { wrapper }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(apiClient.api.get).toHaveBeenCalledWith(
          '/api/projects/project-123/git/history?limit=50&offset=10'
        );
      });
    });

    describe('useCommitDiff', () => {
      it('should fetch commit diff when hash is provided', async () => {
        const mockDiff = {
          hash: 'abc123',
          message: 'Test commit',
          author: 'John Doe',
          email: 'john@example.com',
          date: '2024-01-01',
          filesChanged: 1,
          insertions: 5,
          deletions: 3,
          diff: '+++ added\n--- removed',
        };

        vi.mocked(apiClient.api.get).mockResolvedValue({ data: mockDiff });

        const { result } = renderHook(
          () => useCommitDiff('project-123', 'abc123'),
          { wrapper }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockDiff);
        expect(apiClient.api.get).toHaveBeenCalledWith(
          '/api/projects/project-123/git/commit/abc123'
        );
      });

      it('should not fetch when hash is null', () => {
        const { result } = renderHook(() => useCommitDiff('project-123', null), { wrapper });

        expect(result.current.data).toBeUndefined();
        expect(apiClient.api.get).not.toHaveBeenCalled();
      });
    });

    describe('usePrData', () => {
      it('should fetch PR data when enabled', async () => {
        const mockPrData = {
          title: 'Test PR',
          description: 'PR description',
          commits: [],
        };

        vi.mocked(apiClient.api.get).mockResolvedValue({ data: mockPrData });

        const { result } = renderHook(
          () => usePrData('project-123', 'main', true),
          { wrapper }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPrData);
        expect(apiClient.api.get).toHaveBeenCalledWith(
          '/api/projects/project-123/git/pr-data?base=main'
        );
      });

      it('should not fetch when disabled', () => {
        const { result } = renderHook(
          () => usePrData('project-123', 'main', false),
          { wrapper }
        );

        expect(result.current.data).toBeUndefined();
        expect(apiClient.api.get).not.toHaveBeenCalled();
      });
    });
  });

  describe('Mutation Hooks', () => {
    describe('useCreateBranch', () => {
      it('should create branch and show success toast', async () => {
        const mockBranch = { name: 'feature/test', current: true };

        vi.mocked(apiClient.api.post).mockResolvedValue({ data: mockBranch });

        const { result } = renderHook(() => useCreateBranch(), { wrapper });

        result.current.mutate({ projectId: 'project-123', name: 'feature/test' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(apiClient.api.post).toHaveBeenCalledWith(
          '/api/projects/project-123/git/branch',
          { name: 'feature/test', from: undefined }
        );
        expect(toast.success).toHaveBeenCalledWith('Branch created: feature/test');
      });

      it('should show error toast on failure', async () => {
        vi.mocked(apiClient.api.post).mockRejectedValue(new Error('Branch already exists'));

        const { result } = renderHook(() => useCreateBranch(), { wrapper });

        result.current.mutate({ projectId: 'project-123', name: 'feature/test' });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(toast.error).toHaveBeenCalledWith('Failed to create branch');
      });
    });

    describe('useSwitchBranch', () => {
      it('should switch branch and show success toast', async () => {
        const mockBranch = { name: 'develop', current: true };

        vi.mocked(apiClient.api.post).mockResolvedValue({ data: mockBranch });

        const { result } = renderHook(() => useSwitchBranch(), { wrapper });

        result.current.mutate({ projectId: 'project-123', name: 'develop' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(apiClient.api.post).toHaveBeenCalledWith(
          '/api/projects/project-123/git/branch/switch',
          { name: 'develop' }
        );
        expect(toast.success).toHaveBeenCalledWith('Switched to branch: develop');
      });
    });

    describe('useStageFiles', () => {
      it('should stage files without toast', async () => {
        vi.mocked(apiClient.api.post).mockResolvedValue({ success: true });

        const { result } = renderHook(() => useStageFiles(), { wrapper });

        result.current.mutate({ projectId: 'project-123', files: ['test.txt'] });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(apiClient.api.post).toHaveBeenCalledWith('/api/projects/project-123/git/stage', {
          files: ['test.txt'],
        });
        expect(toast.success).not.toHaveBeenCalled();
      });
    });

    describe('useUnstageFiles', () => {
      it('should unstage files without toast', async () => {
        vi.mocked(apiClient.api.post).mockResolvedValue({ success: true });

        const { result } = renderHook(() => useUnstageFiles(), { wrapper });

        result.current.mutate({ projectId: 'project-123', files: ['test.txt'] });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(apiClient.api.post).toHaveBeenCalledWith('/api/projects/project-123/git/unstage', {
          files: ['test.txt'],
        });
        expect(toast.success).not.toHaveBeenCalled();
      });
    });

    describe('useCommit', () => {
      it('should commit changes and show success toast', async () => {
        const mockResult = { data: { hash: 'abc123' } };

        vi.mocked(apiClient.api.post).mockResolvedValue(mockResult);

        const { result } = renderHook(() => useCommit(), { wrapper });

        result.current.mutate({
          projectId: 'project-123',
          message: 'Test commit',
          files: ['test.txt'],
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(apiClient.api.post).toHaveBeenCalledWith('/api/projects/project-123/git/commit', {
          message: 'Test commit',
          files: ['test.txt'],
        });
        expect(toast.success).toHaveBeenCalledWith('Committed successfully');
      });
    });

    describe('usePush', () => {
      it('should push to remote and show success toast', async () => {
        vi.mocked(apiClient.api.post).mockResolvedValue({ success: true });

        const { result } = renderHook(() => usePush(), { wrapper });

        result.current.mutate({ projectId: 'project-123', branch: 'main' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(apiClient.api.post).toHaveBeenCalledWith('/api/projects/project-123/git/push', {
          branch: 'main',
          remote: undefined,
        });
        expect(toast.success).toHaveBeenCalledWith('Pushed to remote');
      });
    });

    describe('useFetch', () => {
      it('should fetch from remote and show success toast', async () => {
        vi.mocked(apiClient.api.post).mockResolvedValue({ success: true });

        const { result } = renderHook(() => useFetch(), { wrapper });

        result.current.mutate({ projectId: 'project-123' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(apiClient.api.post).toHaveBeenCalledWith('/api/projects/project-123/git/fetch', {
          remote: undefined,
        });
        expect(toast.success).toHaveBeenCalledWith('Fetched from remote');
      });
    });

    describe('useCreatePr', () => {
      it('should create PR and open URL', async () => {
        const mockResult = {
          data: {
            success: true,
            prUrl: 'https://github.com/owner/repo/pull/1',
            useGhCli: true,
          },
        };

        vi.mocked(apiClient.api.post).mockResolvedValue(mockResult);

        // Mock window.open
        const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

        const { result } = renderHook(() => useCreatePr(), { wrapper });

        result.current.mutate({
          projectId: 'project-123',
          title: 'Test PR',
          description: 'PR description',
          baseBranch: 'main',
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(apiClient.api.post).toHaveBeenCalledWith('/api/projects/project-123/git/pr', {
          title: 'Test PR',
          description: 'PR description',
          baseBranch: 'main',
        });
        expect(windowOpenSpy).toHaveBeenCalledWith(
          'https://github.com/owner/repo/pull/1',
          '_blank'
        );
        expect(toast.success).toHaveBeenCalled();

        windowOpenSpy.mockRestore();
      });

      it('should handle PR creation without URL', async () => {
        const mockResult = {
          data: {
            success: true,
            useGhCli: false,
          },
        };

        vi.mocked(apiClient.api.post).mockResolvedValue(mockResult);

        const { result } = renderHook(() => useCreatePr(), { wrapper });

        result.current.mutate({
          projectId: 'project-123',
          title: 'Test PR',
          description: 'PR description',
          baseBranch: 'main',
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(toast.success).toHaveBeenCalled();
      });
    });
  });
});
