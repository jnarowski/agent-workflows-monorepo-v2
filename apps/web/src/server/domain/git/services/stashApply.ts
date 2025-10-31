import simpleGit from 'simple-git';

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
