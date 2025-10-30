import simpleGit from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';
import { formatDistanceToNow } from 'date-fns';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type {
  GitStatus,
  GitFileStatus,
  GitBranch,
  GitCommit,
  GitCommitDiff,
  PrResult,
  GitStashEntry,
  GitResetMode,
  GitMergeResult,
} from '@/shared/types/git.types';

const execAsync = promisify(exec);

// ============================================================================
// Repository Info
// ============================================================================

/**
 * Get the current git branch for a project directory
 * Returns the branch name or null if not a git repository
 */
export async function getCurrentBranch(projectPath: string): Promise<string | null> {
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
  } catch {
    // Gracefully handle non-git directories
    return null;
  }
}

/**
 * Get the full git status including files, branch, and ahead/behind counts
 */
export async function getGitStatus(projectPath: string): Promise<GitStatus> {
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
}

// ============================================================================
// Branch Operations
// ============================================================================

/**
 * Get all branches in the repository
 */
export async function getBranches(projectPath: string): Promise<GitBranch[]> {
  const git = simpleGit(projectPath);
  const branchSummary = await git.branch();

  const branches: GitBranch[] = Object.keys(branchSummary.branches).map((name) => ({
    name,
    current: name === branchSummary.current,
  }));

  // Sort alphabetically
  branches.sort((a, b) => a.name.localeCompare(b.name));

  return branches;
}

/**
 * Create and switch to a new branch
 * Automatically commits any uncommitted changes before creating the branch
 */
export async function createAndSwitchBranch(
  projectPath: string,
  branchName: string,
  from?: string
): Promise<GitBranch> {
  // Validate branch name
  if (!/^[a-zA-Z0-9_/-]+$/.test(branchName)) {
    throw new Error('Invalid branch name. Only alphanumeric, dash, underscore, and slash allowed.');
  }

  const git = simpleGit(projectPath);

  // Check for uncommitted changes
  const status = await git.status();
  const hasChanges = status.files.length > 0;

  // If there are uncommitted changes, commit them first
  if (hasChanges) {
    // Stage all files (including untracked)
    await git.add('.');

    // Commit with auto-generated message
    await git.commit(`Auto-commit before creating branch "${branchName}"`);
  }

  // If from branch is specified, checkout from that branch first
  if (from) {
    await git.checkout(from);
  }

  // Create and switch to new branch
  await git.checkoutLocalBranch(branchName);

  return {
    name: branchName,
    current: true,
  };
}

/**
 * Switch to an existing branch
 */
export async function switchBranch(projectPath: string, branchName: string): Promise<GitBranch> {
  const git = simpleGit(projectPath);
  await git.checkout(branchName);

  return {
    name: branchName,
    current: true,
  };
}

// ============================================================================
// Staging & Commits
// ============================================================================

/**
 * Stage files for commit
 */
export async function stageFiles(projectPath: string, files: string[]): Promise<void> {
  const git = simpleGit(projectPath);
  await git.add(files);
}

/**
 * Unstage files
 */
export async function unstageFiles(projectPath: string, files: string[]): Promise<void> {
  const git = simpleGit(projectPath);
  await git.reset(['HEAD', ...files]);
}

/**
 * Commit changes with a message
 */
export async function commitChanges(
  projectPath: string,
  message: string,
  files: string[]
): Promise<string> {
  const git = simpleGit(projectPath);

  // Stage files first
  await git.add(files);

  // Commit
  const result = await git.commit(message);

  return result.commit;
}

// ============================================================================
// Remote Operations
// ============================================================================

/**
 * Push changes to remote repository
 */
export async function pushToRemote(
  projectPath: string,
  branch: string,
  remote: string = 'origin'
): Promise<void> {
  const git = simpleGit(projectPath);
  await git.push(remote, branch, ['--set-upstream']);
}

/**
 * Fetch changes from remote repository
 */
export async function fetchFromRemote(projectPath: string, remote: string = 'origin'): Promise<void> {
  const git = simpleGit(projectPath);
  await git.fetch(remote);
}

/**
 * Pull changes from remote repository
 */
export async function pullFromRemote(
  projectPath: string,
  remote?: string,
  branch?: string
): Promise<void> {
  const git = simpleGit(projectPath);
  await git.pull(remote, branch);
}

// ============================================================================
// History & Diffs
// ============================================================================

/**
 * Get diff for a specific file
 */
export async function getFileDiff(projectPath: string, filepath: string): Promise<string> {
  const git = simpleGit(projectPath);
  // Use --text to force git to treat all files as text (prevents "Binary files differ" message)
  const diff = await git.diff(['--text', '--', filepath]);
  return diff;
}

/**
 * Get commit history with pagination
 */
export async function getCommitHistory(
  projectPath: string,
  limit: number = 100,
  offset: number = 0
): Promise<GitCommit[]> {
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
}

/**
 * Get detailed diff for a specific commit
 */
export async function getCommitDiff(projectPath: string, commitHash: string): Promise<GitCommitDiff> {
  const git = simpleGit(projectPath);

  // Get commit details
  const commits = await git.log({ maxCount: 1, from: commitHash });
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
}

/**
 * Get commits since a base branch (for PR creation)
 */
export async function getCommitsSinceBase(
  projectPath: string,
  baseBranch: string = 'main'
): Promise<GitCommit[]> {
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
}

// ============================================================================
// Advanced Operations
// ============================================================================

/**
 * Merge a branch into the current branch
 */
export async function mergeBranch(
  projectPath: string,
  sourceBranch: string,
  options?: { noFf?: boolean }
): Promise<GitMergeResult> {
  try {
    const git = simpleGit(projectPath);
    const mergeOptions = [];

    if (options?.noFf) {
      mergeOptions.push('--no-ff');
    }

    await git.merge([sourceBranch, ...mergeOptions]);

    return {
      success: true,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Check if it's a merge conflict
    if (err.message.includes('CONFLICT') || err.message.includes('conflict')) {
      // Try to extract conflicted files
      const git = simpleGit(projectPath);
      const status = await git.status();
      const conflicts = status.conflicted || [];

      return {
        success: false,
        conflicts,
      };
    }

    throw error;
  }
}

/**
 * Save current changes to stash
 */
export async function stashSave(projectPath: string, message?: string): Promise<void> {
  const git = simpleGit(projectPath);
  const args = ['push'];
  if (message) {
    args.push('-m', message);
  }
  await git.stash(args);
}

/**
 * Pop the most recent stash
 */
export async function stashPop(projectPath: string, index?: number): Promise<void> {
  const git = simpleGit(projectPath);
  const args = ['pop'];
  if (index !== undefined) {
    args.push(`stash@{${index}}`);
  }
  await git.stash(args);
}

/**
 * List all stashes
 */
export async function stashList(projectPath: string): Promise<GitStashEntry[]> {
  const git = simpleGit(projectPath);
  const result = await git.stashList();

  return result.all.map((stash, index) => ({
    index,
    message: stash.message,
    date: stash.date,
  }));
}

/**
 * Apply a stash without removing it
 */
export async function stashApply(projectPath: string, index?: number): Promise<void> {
  const git = simpleGit(projectPath);
  const args = ['apply'];
  if (index !== undefined) {
    args.push(`stash@{${index}}`);
  }
  await git.stash(args);
}

/**
 * Reset to a specific commit with mode (soft, mixed, hard)
 */
export async function resetToCommit(
  projectPath: string,
  commitHash: string,
  mode: GitResetMode
): Promise<void> {
  const git = simpleGit(projectPath);
  const modeFlag = `--${mode}`;
  await git.reset([modeFlag, commitHash]);
}

/**
 * Discard changes for specific files
 */
export async function discardChanges(projectPath: string, files: string[]): Promise<void> {
  const git = simpleGit(projectPath);
  await git.checkout(['--', ...files]);
}

// ============================================================================
// GitHub Integration
// ============================================================================

/**
 * Check if GitHub CLI is available and authenticated
 */
export async function checkGhCliAvailable(projectPath: string): Promise<boolean> {
  try {
    await execAsync('gh auth status', { cwd: projectPath });
    return true;
  } catch {
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
  baseBranch: string = 'main'
): Promise<PrResult> {
  try {
    const git = simpleGit(projectPath);

    // Check gh CLI availability
    const ghAvailable = await checkGhCliAvailable(projectPath);

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

        return {
          success: true,
          useGhCli: true,
          prUrl,
        };
      } catch {
        // Fall through to web URL method
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

    return {
      success: true,
      useGhCli: false,
      prUrl: compareUrl,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      success: false,
      useGhCli: false,
      error: err.message,
    };
  }
}

/**
 * Generate an AI-powered commit message based on staged file diffs
 * Requires ANTHROPIC_API_KEY environment variable to be set
 */
export async function generateCommitMessage(projectPath: string, files: string[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured. Please set the environment variable to use AI-generated commit messages.');
  }

  if (!files || files.length === 0) {
    throw new Error('No files provided for commit message generation');
  }

  try {
    const git = simpleGit(projectPath);

    // Get diffs for all selected files
    const diffPromises = files.map(async (file) => {
      try {
        const diff = await git.diff(['--cached', '--text', '--', file]);
        return { file, diff };
      } catch {
        return { file, diff: '' };
      }
    });

    const fileDiffs = await Promise.all(diffPromises);

    // Combine all diffs with file headers
    const combinedDiff = fileDiffs
      .filter((fd) => fd.diff.trim().length > 0)
      .map((fd) => `=== ${fd.file} ===\n${fd.diff}`)
      .join('\n\n');

    if (!combinedDiff || combinedDiff.trim().length === 0) {
      throw new Error('No staged changes found. Please stage files before generating a commit message.');
    }

    // Truncate diff to control token costs (keep first 4000 chars)
    const truncatedDiff = combinedDiff.substring(0, 4000);

    // Generate commit message using AI
    const result = await generateText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: `You are an expert at writing clear, concise git commit messages following conventional commit format.

Rules:
1. Use conventional commit format: <type>: <description>
2. Types: feat, fix, refactor, docs, style, test, chore, perf
3. Keep description under 72 characters
4. Be specific about WHAT changed, not HOW
5. Use imperative mood (e.g., "Add feature" not "Added feature")
6. Do NOT include quotes, periods at the end, or explanations
7. Focus on the most significant change if multiple changes exist

Examples:
- "feat: Add user authentication with JWT"
- "fix: Resolve memory leak in file watcher"
- "refactor: Extract git operations to service layer"
- "docs: Update API endpoint documentation"

Response:
Your response must be ONLY the commit message, nothing else.`,
      prompt: `Generate a commit message for these changes:\n\n${truncatedDiff}`,
      temperature: 0.7,
    });

    // Clean up the generated message
    const message = result.text.trim().replace(/['"]/g, '');

    return message || 'Update files';
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw err;
  }
}
