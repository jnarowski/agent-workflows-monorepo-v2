import simpleGit from 'simple-git';

/**
 * Fetch changes from remote repository
 */
export async function fetchFromRemote(projectPath: string, remote: string = 'origin'): Promise<void> {
  const git = simpleGit(projectPath);
  await git.fetch(remote);
}
