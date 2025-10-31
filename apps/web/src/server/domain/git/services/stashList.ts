import simpleGit from 'simple-git';
import type { GitStashEntry } from '@/shared/types/git.types';

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
