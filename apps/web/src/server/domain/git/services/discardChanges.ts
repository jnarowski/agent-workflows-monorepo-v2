import simpleGit from 'simple-git';

/**
 * Discard changes for specific files
 */
export async function discardChanges(projectPath: string, files: string[]): Promise<void> {
  const git = simpleGit(projectPath);
  await git.checkout(['--', ...files]);
}
