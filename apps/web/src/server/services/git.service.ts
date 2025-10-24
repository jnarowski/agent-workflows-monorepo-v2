import simpleGit from 'simple-git';
import type { FastifyBaseLogger } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import { formatDistanceToNow } from 'date-fns';
import type {
  GitStatus,
  GitFileStatus,
  GitBranch,
  GitCommit,
  GitCommitDiff,
  PrData,
  PrResult,
} from '@/shared/types/git.types';

const execAsync = promisify(exec);

/**
 * Get the current git branch for a project directory
 * Returns the branch name or null if not a git repository
 */
export async function getCurrentBranch(
  projectPath: string,
  logger?: FastifyBaseLogger
): Promise<string | null> {
  try {
    const git = simpleGit(projectPath);

    // Check if directory is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return null;
    }

    // Get current branch
    const branch = await git.branch();
    return branch.current || null;
  } catch (error) {
    // Log error but don't throw - gracefully handle non-git directories
    logger?.debug({ error, projectPath }, 'Failed to get git branch');
    return null;
  }
}

/**
 * Get the full git status including files, branch, and ahead/behind counts
 */
export async function getGitStatus(
  projectPath: string,
  logger?: FastifyBaseLogger
): Promise<GitStatus> {
  try {
    const git = simpleGit(projectPath);

    // Check if directory is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return {
        branch: '',
        files: [],
        ahead: 0,
        behind: 0,
        isRepo: false,
      };
    }

    // Get status
    const status = await git.status();

    // Map files to GitFileStatus format
    const files: GitFileStatus[] = [];

    // Staged files
    for (const file of status.staged) {
      files.push({
        path: file,
        status: 'M',
        staged: true,
      });
    }

    // Modified files (unstaged)
    for (const file of status.modified) {
      if (!status.staged.includes(file)) {
        files.push({
          path: file,
          status: 'M',
          staged: false,
        });
      }
    }

    // Created files (new staged files)
    for (const file of status.created) {
      files.push({
        path: file,
        status: 'A',
        staged: true,
      });
    }

    // Deleted files
    for (const file of status.deleted) {
      files.push({
        path: file,
        status: 'D',
        staged: status.staged.includes(file),
      });
    }

    // Untracked files
    for (const file of status.not_added) {
      files.push({
        path: file,
        status: '??',
        staged: false,
      });
    }

    // Renamed files
    for (const file of status.renamed) {
      files.push({
        path: file.to || file.from,
        status: 'R',
        staged: true,
      });
    }

    return {
      branch: status.current || '',
      files,
      ahead: status.ahead,
      behind: status.behind,
      isRepo: true,
    };
  } catch (error) {
    logger?.error({ error, projectPath }, 'Failed to get git status');
    throw error;
  }
}

/**
 * Get all branches in the repository
 */
export async function getBranches(
  projectPath: string,
  logger?: FastifyBaseLogger
): Promise<GitBranch[]> {
  try {
    const git = simpleGit(projectPath);
    const branchSummary = await git.branch();

    const branches: GitBranch[] = Object.keys(branchSummary.branches).map((name) => ({
      name,
      current: name === branchSummary.current,
    }));

    // Sort alphabetically
    branches.sort((a, b) => a.name.localeCompare(b.name));

    return branches;
  } catch (error) {
    logger?.error({ error, projectPath }, 'Failed to get branches');
    throw error;
  }
}

/**
 * Create and switch to a new branch
 */
export async function createAndSwitchBranch(
  projectPath: string,
  branchName: string,
  from?: string,
  logger?: FastifyBaseLogger
): Promise<GitBranch> {
  try {
    // Validate branch name
    if (!/^[a-zA-Z0-9_\/-]+$/.test(branchName)) {
      throw new Error('Invalid branch name. Only alphanumeric, dash, underscore, and slash allowed.');
    }

    const git = simpleGit(projectPath);
    await git.checkoutLocalBranch(branchName, from);

    return {
      name: branchName,
      current: true,
    };
  } catch (error) {
    logger?.error({ error, projectPath, branchName }, 'Failed to create and switch branch');
    throw error;
  }
}

/**
 * Switch to an existing branch
 */
export async function switchBranch(
  projectPath: string,
  branchName: string,
  logger?: FastifyBaseLogger
): Promise<GitBranch> {
  try {
    const git = simpleGit(projectPath);
    await git.checkout(branchName);

    return {
      name: branchName,
      current: true,
    };
  } catch (error) {
    logger?.error({ error, projectPath, branchName }, 'Failed to switch branch');
    throw error;
  }
}

/**
 * Stage files for commit
 */
export async function stageFiles(
  projectPath: string,
  files: string[],
  logger?: FastifyBaseLogger
): Promise<void> {
  try {
    const git = simpleGit(projectPath);
    await git.add(files);
  } catch (error) {
    logger?.error({ error, projectPath, files }, 'Failed to stage files');
    throw error;
  }
}

/**
 * Unstage files
 */
export async function unstageFiles(
  projectPath: string,
  files: string[],
  logger?: FastifyBaseLogger
): Promise<void> {
  try {
    const git = simpleGit(projectPath);
    await git.reset(['HEAD', ...files]);
  } catch (error) {
    logger?.error({ error, projectPath, files }, 'Failed to unstage files');
    throw error;
  }
}

/**
 * Commit changes with a message
 */
export async function commitChanges(
  projectPath: string,
  message: string,
  files: string[],
  logger?: FastifyBaseLogger
): Promise<string> {
  try {
    const git = simpleGit(projectPath);

    // Stage files first
    await git.add(files);

    // Commit
    const result = await git.commit(message);

    return result.commit;
  } catch (error) {
    logger?.error({ error, projectPath, message }, 'Failed to commit changes');
    throw error;
  }
}

/**
 * Push changes to remote repository
 */
export async function pushToRemote(
  projectPath: string,
  branch: string,
  remote: string = 'origin',
  logger?: FastifyBaseLogger
): Promise<void> {
  try {
    const git = simpleGit(projectPath);
    await git.push(remote, branch, ['--set-upstream']);
    logger?.info({ remote, branch }, 'Pushed to remote');
  } catch (error) {
    logger?.error({ error, projectPath, branch, remote }, 'Failed to push to remote');
    throw error;
  }
}

/**
 * Fetch changes from remote repository
 */
export async function fetchFromRemote(
  projectPath: string,
  remote: string = 'origin',
  logger?: FastifyBaseLogger
): Promise<void> {
  try {
    const git = simpleGit(projectPath);
    await git.fetch(remote);
    logger?.info({ remote }, 'Fetched from remote');
  } catch (error) {
    logger?.error({ error, projectPath, remote }, 'Failed to fetch from remote');
    throw error;
  }
}

/**
 * Get diff for a specific file
 */
export async function getFileDiff(
  projectPath: string,
  filepath: string,
  logger?: FastifyBaseLogger
): Promise<string> {
  try {
    const git = simpleGit(projectPath);
    const diff = await git.diff(['--', filepath]);
    return diff;
  } catch (error) {
    logger?.error({ error, projectPath, filepath }, 'Failed to get file diff');
    throw error;
  }
}

/**
 * Get commit history with pagination
 */
export async function getCommitHistory(
  projectPath: string,
  limit: number = 100,
  offset: number = 0,
  logger?: FastifyBaseLogger
): Promise<GitCommit[]> {
  try {
    const git = simpleGit(projectPath);
    const log = await git.log({
      maxCount: limit,
      from: offset > 0 ? `HEAD~${offset}` : undefined,
    });

    const commits: GitCommit[] = log.all.map((commit) => {
      const date = new Date(commit.date);
      return {
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
        date: date.toISOString(),
        relativeDate: formatDistanceToNow(date, { addSuffix: true }),
      };
    });

    return commits;
  } catch (error) {
    logger?.error({ error, projectPath, limit, offset }, 'Failed to get commit history');
    throw error;
  }
}

/**
 * Get detailed diff for a specific commit
 */
export async function getCommitDiff(
  projectPath: string,
  commitHash: string,
  logger?: FastifyBaseLogger
): Promise<GitCommitDiff> {
  try {
    const git = simpleGit(projectPath);

    // Get commit details
    const commits = await git.log({ maxCount: 1, from: commitHash, to: commitHash });
    const commit = commits.all[0];

    if (!commit) {
      throw new Error('Commit not found');
    }

    // Get full diff
    const diff = await git.diff([`${commitHash}^`, commitHash]);

    // Get stats using show
    const showOutput = await git.show([commitHash, '--stat', '--format=']);

    // Parse stats from show output
    const statsMatch = showOutput.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
    const filesChanged = statsMatch ? parseInt(statsMatch[1], 10) : 0;
    const insertions = statsMatch && statsMatch[2] ? parseInt(statsMatch[2], 10) : 0;
    const deletions = statsMatch && statsMatch[3] ? parseInt(statsMatch[3], 10) : 0;

    return {
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      email: commit.author_email,
      date: new Date(commit.date).toISOString(),
      filesChanged,
      insertions,
      deletions,
      diff,
    };
  } catch (error) {
    logger?.error({ error, projectPath, commitHash }, 'Failed to get commit diff');
    throw error;
  }
}

/**
 * Get commits since a base branch (for PR creation)
 */
export async function getCommitsSinceBase(
  projectPath: string,
  baseBranch: string = 'main',
  logger?: FastifyBaseLogger
): Promise<GitCommit[]> {
  try {
    const git = simpleGit(projectPath);
    const log = await git.log([`${baseBranch}..HEAD`]);

    const commits: GitCommit[] = log.all.map((commit) => {
      const date = new Date(commit.date);
      return {
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
        date: date.toISOString(),
        relativeDate: formatDistanceToNow(date, { addSuffix: true }),
      };
    });

    return commits;
  } catch (error) {
    logger?.error({ error, projectPath, baseBranch }, 'Failed to get commits since base');
    throw error;
  }
}

/**
 * Check if GitHub CLI is available and authenticated
 */
export async function checkGhCliAvailable(
  projectPath: string,
  logger?: FastifyBaseLogger
): Promise<boolean> {
  try {
    await execAsync('gh auth status', { cwd: projectPath });
    logger?.info('GitHub CLI is available and authenticated');
    return true;
  } catch (error) {
    logger?.debug('GitHub CLI not available or not authenticated');
    return false;
  }
}

/**
 * Create a pull request (tries gh CLI, falls back to web URL)
 */
export async function createPullRequest(
  projectPath: string,
  title: string,
  description: string,
  baseBranch: string = 'main',
  logger?: FastifyBaseLogger
): Promise<PrResult> {
  try {
    const git = simpleGit(projectPath);

    // Check gh CLI availability
    const ghAvailable = await checkGhCliAvailable(projectPath, logger);

    if (ghAvailable) {
      // Try using gh CLI
      try {
        const { stdout } = await execAsync(
          `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${description.replace(/"/g, '\\"')}" --base ${baseBranch}`,
          { cwd: projectPath }
        );

        // Extract PR URL from output
        const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/);
        const prUrl = urlMatch ? urlMatch[0] : undefined;

        logger?.info({ prUrl }, 'Pull request created via gh CLI');
        return {
          success: true,
          useGhCli: true,
          prUrl,
        };
      } catch (error) {
        logger?.warn({ error }, 'Failed to create PR via gh CLI, falling back to web URL');
      }
    }

    // Fallback: construct GitHub compare URL
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');

    if (!origin || !origin.refs.push) {
      throw new Error('No origin remote found');
    }

    // Parse GitHub URL from remote
    // Supports both HTTPS and SSH formats
    let repoPath = '';
    if (origin.refs.push.startsWith('https://')) {
      // HTTPS: https://github.com/owner/repo.git
      const match = origin.refs.push.match(/https:\/\/github\.com\/([^/]+\/[^/]+?)(\.git)?$/);
      repoPath = match ? match[1] : '';
    } else if (origin.refs.push.startsWith('git@')) {
      // SSH: git@github.com:owner/repo.git
      const match = origin.refs.push.match(/git@github\.com:([^/]+\/[^/]+?)(\.git)?$/);
      repoPath = match ? match[1] : '';
    }

    if (!repoPath) {
      throw new Error('Could not parse GitHub repository from remote URL');
    }

    // Get current branch
    const status = await git.status();
    const currentBranch = status.current || 'HEAD';

    const compareUrl = `https://github.com/${repoPath}/compare/${baseBranch}...${currentBranch}?expand=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(description)}`;

    logger?.info({ compareUrl }, 'Generated GitHub compare URL for PR creation');
    return {
      success: true,
      useGhCli: false,
      prUrl: compareUrl,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger?.error({ error: err, projectPath }, 'Failed to create pull request');
    return {
      success: false,
      useGhCli: false,
      error: err.message,
    };
  }
}
