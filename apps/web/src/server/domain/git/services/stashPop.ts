import simpleGit from 'simple-git';

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
