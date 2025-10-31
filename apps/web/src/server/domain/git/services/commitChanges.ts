import simpleGit from 'simple-git';

/**
 * Commit changes with a message
 */
export async function commitChanges(
  projectPath: string,
  message: string,
  files: string[]
): Promise<string> {
  const git = simpleGit(projectPath);

  // Stage files first
  await git.add(files);

  // Commit
  const result = await git.commit(message);

  return result.commit;
}
