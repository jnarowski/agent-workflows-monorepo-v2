import simpleGit from 'simple-git';
import type { GitBranch } from '@/shared/types/git.types';

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
