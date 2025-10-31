import simpleGit from 'simple-git';
import type { GitBranch } from '@/shared/types/git.types';

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
