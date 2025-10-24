import simpleGit from 'simple-git';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Get the current git branch for a project directory
 * Returns the branch name or null if not a git repository
 */
export async function getCurrentBranch(
  projectPath: string,
  logger?: FastifyBaseLogger
): Promise<string | null> {
  try {
    const git = simpleGit(projectPath);

    // Check if directory is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.log(`[git.service] Not a git repo: ${projectPath}`);
      return null;
    }

    // Get current branch
    const branch = await git.branch();
    console.log(`[git.service] Branch for ${projectPath}: ${branch.current}`);
    return branch.current || null;
  } catch (error) {
    // Log error but don't throw - gracefully handle non-git directories
    console.error(`[git.service] Error getting branch for ${projectPath}:`, error);
    logger?.debug({ error, projectPath }, 'Failed to get git branch');
    return null;
  }
}
