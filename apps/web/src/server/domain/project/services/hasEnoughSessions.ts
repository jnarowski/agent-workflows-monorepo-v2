import fs from "fs/promises";
import path from "path";
import { getClaudeProjectsDir } from "@/server/utils/path";

/**
 * Check if a file is a valid session file
 * Valid files must end with .jsonl and NOT start with "agent-"
 * @param filename - The filename to check
 * @returns True if valid session file, false otherwise
 */
function isValidSessionFile(filename: string): boolean {
  return filename.endsWith('.jsonl') && !filename.startsWith('agent-');
}

/**
 * Check if a project directory has more than minSessions sessions
 * @param projectName - Encoded project name from filesystem
 * @param minSessions - Minimum session count (default 3)
 * @returns True if project has more than minSessions
 */
export async function hasEnoughSessions(
  projectName: string,
  minSessions: number = 3
): Promise<boolean> {
  const projectDir = path.join(getClaudeProjectsDir(), projectName);

  try {
    await fs.access(projectDir);
    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter(isValidSessionFile);

    // Check if project has more than minSessions sessions
    return jsonlFiles.length > minSessions;
  } catch {
    return false;
  }
}
