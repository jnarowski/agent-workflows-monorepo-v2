import simpleGit from 'simple-git';

/**
 * Stage files for commit
 */
export async function stageFiles(projectPath: string, files: string[]): Promise<void> {
  const git = simpleGit(projectPath);
  await git.add(files);
}
