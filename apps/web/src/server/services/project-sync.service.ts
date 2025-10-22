import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import { projectService } from "./project.service";
import { agentSessionService } from "./agent-session.service";
import type { SyncProjectsResponse } from "../../shared/types/project-sync.types";

/**
 * Project Sync Service
 * Handles syncing projects from ~/.claude/projects/ directory
 */
export class ProjectSyncService {
  /**
   * Get the Claude projects directory path
   * @returns Path to ~/.claude/projects/
   */
  private getClaudeProjectsDir(): string {
    return path.join(os.homedir(), ".claude", "projects");
  }

  /**
   * Decode filesystem-encoded project path back to real path
   * @param projectName - Encoded project name (e.g., "Users-john-myproject")
   * @returns Decoded path (e.g., "/Users/john/myproject")
   */
  private decodeProjectPath(projectName: string): string {
    const decoded = projectName.replace(/-/g, "/");
    // Add leading slash if not present
    return decoded.startsWith("/") ? decoded : `/${decoded}`;
  }

  /**
   * Extract the actual project directory from JSONL session files
   * @param projectName - Encoded project name from filesystem
   * @returns Extracted project path
   */
  private async extractProjectDirectory(projectName: string): Promise<string> {
    const projectDir = path.join(this.getClaudeProjectsDir(), projectName);
    const cwdCounts = new Map<string, number>();
    let latestTimestamp = 0;
    let latestCwd: string | null = null;
    let extractedPath: string;

    try {
      // Check if the project directory exists
      await fs.access(projectDir);

      const files = await fs.readdir(projectDir);
      const jsonlFiles = files.filter((file) => file.endsWith(".jsonl"));

      if (jsonlFiles.length === 0) {
        // Fall back to decoded project name if no sessions
        extractedPath = this.decodeProjectPath(projectName);
      } else {
        // Process all JSONL files to collect cwd values
        for (const file of jsonlFiles) {
          const jsonlFile = path.join(projectDir, file);
          const fileStream = fsSync.createReadStream(jsonlFile);
          const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
          });

          for await (const line of rl) {
            if (line.trim()) {
              try {
                const entry = JSON.parse(line);

                if (entry.cwd) {
                  // Count occurrences of each cwd
                  cwdCounts.set(entry.cwd, (cwdCounts.get(entry.cwd) || 0) + 1);

                  // Track the most recent cwd
                  const timestamp = new Date(
                    entry.timestamp || 0
                  ).getTime();
                  if (timestamp > latestTimestamp) {
                    latestTimestamp = timestamp;
                    latestCwd = entry.cwd;
                  }
                }
              } catch (parseError) {
                // Skip malformed lines
              }
            }
          }
        }

        // Determine the best cwd to use
        if (cwdCounts.size === 0) {
          // No cwd found, fall back to decoded project name
          extractedPath = this.decodeProjectPath(projectName);
        } else if (cwdCounts.size === 1) {
          // Only one cwd, use it
          extractedPath = Array.from(cwdCounts.keys())[0];
        } else {
          // Multiple cwd values - prefer the most recent one if it has reasonable usage
          const mostRecentCount = cwdCounts.get(latestCwd!) || 0;
          const maxCount = Math.max(...cwdCounts.values());

          // Use most recent if it has at least 25% of the max count
          if (mostRecentCount >= maxCount * 0.25) {
            extractedPath = latestCwd!;
          } else {
            // Otherwise use the most frequently used cwd
            extractedPath = "";
            for (const [cwd, count] of cwdCounts.entries()) {
              if (count === maxCount) {
                extractedPath = cwd;
                break;
              }
            }
          }

          // Fallback (shouldn't reach here)
          if (!extractedPath) {
            extractedPath =
              latestCwd || this.decodeProjectPath(projectName);
          }
        }
      }

      return extractedPath;
    } catch (error: any) {
      // If the directory doesn't exist, just use the decoded project name
      if (error.code === "ENOENT") {
        extractedPath = this.decodeProjectPath(projectName);
      } else {
        console.error(
          `Error extracting project directory for ${projectName}:`,
          error
        );
        // Fall back to decoded project name for other errors
        extractedPath = this.decodeProjectPath(projectName);
      }

      return extractedPath;
    }
  }

  /**
   * Check if a project directory has more than minSessions sessions
   * @param projectName - Encoded project name from filesystem
   * @param minSessions - Minimum session count (default 3)
   * @returns True if project has more than minSessions
   */
  private async hasEnoughSessions(
    projectName: string,
    minSessions: number = 3
  ): Promise<boolean> {
    const projectDir = path.join(this.getClaudeProjectsDir(), projectName);

    try {
      await fs.access(projectDir);
      const files = await fs.readdir(projectDir);
      const jsonlFiles = files.filter((file) => file.endsWith(".jsonl"));

      // Check if project has more than minSessions sessions
      return jsonlFiles.length > minSessions;
    } catch {
      return false;
    }
  }

  /**
   * Sync projects from Claude CLI ~/.claude/projects/ directory
   * Only imports projects with more than 3 sessions
   * @param userId - User ID for session sync
   * @returns Sync statistics
   */
  async syncFromClaudeProjects(
    userId: string
  ): Promise<SyncProjectsResponse> {
    let projectsImported = 0;
    let projectsUpdated = 0;
    let totalSessionsSynced = 0;

    const claudeProjectsDir = this.getClaudeProjectsDir();

    try {
      // Check if directory exists
      await fs.access(claudeProjectsDir);
    } catch (error) {
      // Directory doesn't exist, return empty stats
      return {
        projectsImported: 0,
        projectsUpdated: 0,
        totalSessionsSynced: 0,
      };
    }

    // Read directory entries
    const entries = await fs.readdir(claudeProjectsDir, {
      withFileTypes: true,
    });

    // Filter for directories only
    const projectDirs = entries.filter((entry) => entry.isDirectory());

    // Process each project directory
    for (const projectDir of projectDirs) {
      const projectName = projectDir.name;

      // Skip projects without enough sessions (must have >3 sessions)
      const hasEnoughSessions = await this.hasEnoughSessions(projectName);
      if (!hasEnoughSessions) {
        continue;
      }

      // Extract actual project path
      const actualPath = await this.extractProjectDirectory(projectName);

      // Generate display name from last path segment
      const displayName = path.basename(actualPath);

      // Create or update project
      const project = await projectService.createOrUpdateProject(
        displayName,
        actualPath
      );

      // Determine if project was created or updated
      const isNewProject =
        project.created_at.getTime() === project.updated_at.getTime();

      if (isNewProject) {
        projectsImported++;
      } else {
        projectsUpdated++;
      }

      // Sync sessions for this project
      const sessionsSyncResult = await agentSessionService.syncProjectSessions(
        project.id,
        userId
      );

      totalSessionsSynced += sessionsSyncResult.synced;
    }

    return {
      projectsImported,
      projectsUpdated,
      totalSessionsSynced,
    };
  }
}

// Export singleton instance
export const projectSyncService = new ProjectSyncService();
