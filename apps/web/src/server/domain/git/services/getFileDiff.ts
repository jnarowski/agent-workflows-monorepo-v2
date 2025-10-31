import simpleGit from 'simple-git';

/**
 * Get diff for a specific file
 */
export async function getFileDiff(projectPath: string, filepath: string): Promise<string> {
  const git = simpleGit(projectPath);
  // Use --text to force git to treat all files as text (prevents "Binary files differ" message)
  const diff = await git.diff(['--text', '--', filepath]);
  return diff;
}
