import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import simpleGit, { type SimpleGit } from 'simple-git';
import {
  getGitStatus,
  getBranches,
  createAndSwitchBranch,
  switchBranch,
  stageFiles,
  unstageFiles,
  commitChanges,
  pushToRemote,
  fetchFromRemote,
  getFileDiff,
  getCommitHistory,
  getCommitsSinceBase,
  checkGhCliAvailable,
} from './git.service';

// Mock simple-git
vi.mock('simple-git');

describe('Git Service', () => {
  let mockGit: Partial<SimpleGit>;
  let mockSimpleGit: MockedFunction<typeof simpleGit>;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock git instance
    mockGit = {
      checkIsRepo: vi.fn(),
      status: vi.fn(),
      branch: vi.fn(),
      checkoutLocalBranch: vi.fn(),
      checkout: vi.fn(),
      add: vi.fn(),
      reset: vi.fn(),
      commit: vi.fn(),
      push: vi.fn(),
      fetch: vi.fn(),
      diff: vi.fn(),
      log: vi.fn(),
      show: vi.fn(),
      raw: vi.fn(),
    };

    // Mock simpleGit to return our mock instance
    mockSimpleGit = simpleGit as MockedFunction<typeof simpleGit>;
    mockSimpleGit.mockReturnValue(mockGit as SimpleGit);
  });

  describe('getGitStatus', () => {
    it('should return git status with files', async () => {
      const mockStatus = {
        current: 'main',
        files: [
          { path: 'file1.txt', index: 'M', working_dir: ' ' },
          { path: 'file2.txt', index: ' ', working_dir: 'M' },
          { path: 'file3.txt', index: '?', working_dir: '?' },
        ],
        ahead: 2,
        behind: 1,
      };

      (mockGit.checkIsRepo as MockedFunction<any>).mockResolvedValue(true);
      (mockGit.status as MockedFunction<any>).mockResolvedValue(mockStatus);

      const result = await getGitStatus('/test/path');

      expect(result.branch).toBe('main');
      expect(result.isRepo).toBe(true);
      expect(result.ahead).toBe(2);
      expect(result.behind).toBe(1);
      expect(result.files).toHaveLength(3);
      expect(result.files[0]).toEqual({
        path: 'file1.txt',
        status: 'M',
        staged: true,
      });
      expect(result.files[1]).toEqual({
        path: 'file2.txt',
        status: 'M',
        staged: false,
      });
      expect(result.files[2]).toEqual({
        path: 'file3.txt',
        status: '??',
        staged: false,
      });
    });

    it('should handle non-repo gracefully', async () => {
      (mockGit.checkIsRepo as MockedFunction<any>).mockResolvedValue(false);

      const result = await getGitStatus('/test/path');

      expect(result.isRepo).toBe(false);
      expect(result.files).toEqual([]);
    });

    it('should handle errors and throw', async () => {
      (mockGit.checkIsRepo as MockedFunction<any>).mockRejectedValue(new Error('Git error'));

      await expect(getGitStatus('/test/path')).rejects.toThrow('Git error');
    });
  });

  describe('getBranches', () => {
    it('should return list of branches with current marked', async () => {
      const mockBranchSummary = {
        all: ['main', 'feature/test', 'develop'],
        current: 'main',
        branches: {
          main: { current: true, name: 'main' },
          'feature/test': { current: false, name: 'feature/test' },
          develop: { current: false, name: 'develop' },
        },
      };

      (mockGit.branch as MockedFunction<any>).mockResolvedValue(mockBranchSummary);

      const result = await getBranches('/test/path');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'main', current: true });
      expect(result[1]).toEqual({ name: 'feature/test', current: false });
      expect(result[2]).toEqual({ name: 'develop', current: false });
    });

    it('should handle errors', async () => {
      (mockGit.branch as MockedFunction<any>).mockRejectedValue(new Error('Branch error'));

      await expect(getBranches('/test/path')).rejects.toThrow('Branch error');
    });
  });

  describe('createAndSwitchBranch', () => {
    it('should create and switch to new branch', async () => {
      (mockGit.checkoutLocalBranch as MockedFunction<any>).mockResolvedValue({});

      const result = await createAndSwitchBranch('/test/path', 'feature/new');

      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature/new');
      expect(result).toEqual({ name: 'feature/new', current: true });
    });

    it('should create branch from specific base', async () => {
      (mockGit.checkout as MockedFunction<any>).mockResolvedValue({});
      (mockGit.checkoutLocalBranch as MockedFunction<any>).mockResolvedValue({});

      const result = await createAndSwitchBranch('/test/path', 'feature/new', 'develop');

      expect(mockGit.checkout).toHaveBeenCalledWith('develop');
      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature/new');
      expect(result).toEqual({ name: 'feature/new', current: true });
    });

    it('should reject invalid branch names', async () => {
      await expect(createAndSwitchBranch('/test/path', 'invalid name')).rejects.toThrow(
        'Invalid branch name'
      );
      await expect(createAndSwitchBranch('/test/path', 'invalid@name')).rejects.toThrow(
        'Invalid branch name'
      );
    });
  });

  describe('switchBranch', () => {
    it('should switch to existing branch', async () => {
      (mockGit.checkout as MockedFunction<any>).mockResolvedValue({});

      const result = await switchBranch('/test/path', 'develop');

      expect(mockGit.checkout).toHaveBeenCalledWith('develop');
      expect(result).toEqual({ name: 'develop', current: true });
    });

    it('should handle checkout errors', async () => {
      (mockGit.checkout as MockedFunction<any>).mockRejectedValue(
        new Error('Branch does not exist')
      );

      await expect(switchBranch('/test/path', 'nonexistent')).rejects.toThrow(
        'Branch does not exist'
      );
    });
  });

  describe('stageFiles', () => {
    it('should stage multiple files', async () => {
      (mockGit.add as MockedFunction<any>).mockResolvedValue({});

      await stageFiles('/test/path', ['file1.txt', 'file2.txt']);

      expect(mockGit.add).toHaveBeenCalledWith(['file1.txt', 'file2.txt']);
    });

    it('should handle staging errors', async () => {
      (mockGit.add as MockedFunction<any>).mockRejectedValue(new Error('Stage error'));

      await expect(stageFiles('/test/path', ['file1.txt'])).rejects.toThrow('Stage error');
    });
  });

  describe('unstageFiles', () => {
    it('should unstage multiple files', async () => {
      (mockGit.reset as MockedFunction<any>).mockResolvedValue({});

      await unstageFiles('/test/path', ['file1.txt', 'file2.txt']);

      expect(mockGit.reset).toHaveBeenCalledWith(['HEAD', 'file1.txt', 'file2.txt']);
    });

    it('should handle unstaging errors', async () => {
      (mockGit.reset as MockedFunction<any>).mockRejectedValue(new Error('Unstage error'));

      await expect(unstageFiles('/test/path', ['file1.txt'])).rejects.toThrow('Unstage error');
    });
  });

  describe('commitChanges', () => {
    it('should commit staged files', async () => {
      const mockCommitResult = { commit: 'abc123' };
      (mockGit.commit as MockedFunction<any>).mockResolvedValue(mockCommitResult);

      const result = await commitChanges('/test/path', 'Test commit', ['file1.txt']);

      expect(mockGit.commit).toHaveBeenCalledWith('Test commit', ['file1.txt']);
      expect(result).toBe('abc123');
    });

    it('should handle commit errors', async () => {
      (mockGit.commit as MockedFunction<any>).mockRejectedValue(new Error('Commit error'));

      await expect(commitChanges('/test/path', 'Test', ['file1.txt'])).rejects.toThrow(
        'Commit error'
      );
    });
  });

  describe('pushToRemote', () => {
    it('should push to remote with default origin', async () => {
      (mockGit.push as MockedFunction<any>).mockResolvedValue({});

      await pushToRemote('/test/path', 'main');

      expect(mockGit.push).toHaveBeenCalledWith('origin', 'main');
    });

    it('should push to custom remote', async () => {
      (mockGit.push as MockedFunction<any>).mockResolvedValue({});

      await pushToRemote('/test/path', 'main', 'upstream');

      expect(mockGit.push).toHaveBeenCalledWith('upstream', 'main');
    });

    it('should handle push errors', async () => {
      (mockGit.push as MockedFunction<any>).mockRejectedValue(new Error('Push rejected'));

      await expect(pushToRemote('/test/path', 'main')).rejects.toThrow('Push rejected');
    });
  });

  describe('fetchFromRemote', () => {
    it('should fetch from default origin', async () => {
      (mockGit.fetch as MockedFunction<any>).mockResolvedValue({});

      await fetchFromRemote('/test/path');

      expect(mockGit.fetch).toHaveBeenCalledWith('origin');
    });

    it('should fetch from custom remote', async () => {
      (mockGit.fetch as MockedFunction<any>).mockResolvedValue({});

      await fetchFromRemote('/test/path', 'upstream');

      expect(mockGit.fetch).toHaveBeenCalledWith('upstream');
    });

    it('should handle fetch errors', async () => {
      (mockGit.fetch as MockedFunction<any>).mockRejectedValue(new Error('Fetch error'));

      await expect(fetchFromRemote('/test/path')).rejects.toThrow('Fetch error');
    });
  });

  describe('getFileDiff', () => {
    it('should return file diff', async () => {
      const mockDiff = '+++ added line\n--- removed line';
      (mockGit.diff as MockedFunction<any>).mockResolvedValue(mockDiff);

      const result = await getFileDiff('/test/path', 'file1.txt');

      expect(mockGit.diff).toHaveBeenCalledWith(['--', 'file1.txt']);
      expect(result).toBe(mockDiff);
    });

    it('should handle diff errors', async () => {
      (mockGit.diff as MockedFunction<any>).mockRejectedValue(new Error('Diff error'));

      await expect(getFileDiff('/test/path', 'file1.txt')).rejects.toThrow('Diff error');
    });
  });

  describe('getCommitHistory', () => {
    it('should return commit history with default limit', async () => {
      const mockLog = {
        all: [
          {
            hash: 'abc123',
            message: 'Test commit',
            author_name: 'John Doe',
            author_email: 'john@example.com',
            date: '2024-01-01T10:00:00Z',
          },
        ],
      };
      (mockGit.log as MockedFunction<any>).mockResolvedValue(mockLog);

      const result = await getCommitHistory('/test/path');

      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].hash).toBe('abc123');
      expect(result[0].shortHash).toBe('abc123');
      expect(result[0].message).toBe('Test commit');
      expect(result[0].author).toBe('John Doe');
    });

    it('should handle custom limit and offset', async () => {
      const mockLog = { all: [] };
      (mockGit.log as MockedFunction<any>).mockResolvedValue(mockLog);

      await getCommitHistory('/test/path', 50, 10);

      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 50, from: 10 });
    });
  });

  describe('checkGhCliAvailable', () => {
    it('should return true if gh CLI is available', async () => {
      (mockGit.raw as MockedFunction<any>).mockResolvedValue('Logged in');

      const result = await checkGhCliAvailable('/test/path');

      expect(result).toBe(true);
    });

    it('should return false if gh CLI is not available', async () => {
      (mockGit.raw as MockedFunction<any>).mockRejectedValue(new Error('Command not found'));

      const result = await checkGhCliAvailable('/test/path');

      expect(result).toBe(false);
    });
  });

  describe('getCommitsSinceBase', () => {
    it('should return commits since base branch', async () => {
      const mockLog = {
        all: [
          {
            hash: 'abc123',
            message: 'Feature commit',
            author_name: 'Jane Doe',
            author_email: 'jane@example.com',
            date: '2024-01-02T10:00:00Z',
          },
        ],
      };
      (mockGit.log as MockedFunction<any>).mockResolvedValue(mockLog);

      const result = await getCommitsSinceBase('/test/path', 'main');

      expect(mockGit.log).toHaveBeenCalledWith(['main..HEAD']);
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Feature commit');
    });
  });
});
