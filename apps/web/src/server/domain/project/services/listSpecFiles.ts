import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * List all spec files from .agent/specs/todo/ directory
 * @param projectPath - Absolute path to project directory
 * @returns Array of relative paths to spec files
 */
export async function listSpecFiles(projectPath: string): Promise<string[]> {
  const specsDir = join(projectPath, ".agent", "specs", "todo");

  try {
    const files = await readdir(specsDir, { recursive: true, withFileTypes: true });

    // Filter for markdown files only
    const specFiles = files
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".md"))
      .map((dirent) => {
        // Get relative path from specsDir
        const relativePath = dirent.parentPath
          ? join(dirent.parentPath.replace(specsDir, ""), dirent.name)
          : dirent.name;

        // Remove leading slash if present
        return relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
      })
      .sort(); // Alphabetical order

    return specFiles;
  } catch (error) {
    // If directory doesn't exist or is not readable, return empty array
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
