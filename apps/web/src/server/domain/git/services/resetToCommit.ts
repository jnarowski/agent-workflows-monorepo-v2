import simpleGit from 'simple-git';
import type { GitResetMode } from '@/shared/types/git.types';

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
