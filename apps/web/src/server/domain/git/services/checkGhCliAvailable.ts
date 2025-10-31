import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if GitHub CLI is available and authenticated
 */
export async function checkGhCliAvailable(projectPath: string): Promise<boolean> {
  try {
    await execAsync('gh auth status', { cwd: projectPath });
    return true;
  } catch {
    return false;
  }
}
