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
      return null;
    }

    // Get current branch
    const branch = await git.branch();
    return branch.current || null;
  } catch (error) {
    // Log error but don't throw - gracefully handle non-git directories
    logger?.debug({ error, projectPath }, 'Failed to get git branch');
    return null;
  }
}
