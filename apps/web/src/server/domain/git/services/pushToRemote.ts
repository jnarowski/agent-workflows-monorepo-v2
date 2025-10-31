import simpleGit from 'simple-git';

/**
 * Push changes to remote repository
 */
export async function pushToRemote(
  projectPath: string,
  branch: string,
  remote: string = 'origin'
): Promise<void> {
  const git = simpleGit(projectPath);
  await git.push(remote, branch, ['--set-upstream']);
}
