import simpleGit from 'simple-git';

/**
 * Unstage files
 */
export async function unstageFiles(projectPath: string, files: string[]): Promise<void> {
  const git = simpleGit(projectPath);
  await git.reset(['HEAD', ...files]);
}
