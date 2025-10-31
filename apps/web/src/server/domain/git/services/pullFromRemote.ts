import simpleGit from 'simple-git';

/**
 * Pull changes from remote repository
 */
export async function pullFromRemote(
  projectPath: string,
  remote?: string,
  branch?: string
): Promise<void> {
  const git = simpleGit(projectPath);
  await git.pull(remote, branch);
}
