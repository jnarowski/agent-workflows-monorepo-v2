import simpleGit from 'simple-git';

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
