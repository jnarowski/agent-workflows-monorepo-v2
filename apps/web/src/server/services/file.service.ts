import fs from 'fs/promises';
import path from 'path';
import type { FastifyBaseLogger } from 'fastify';
import type { FileTreeItem } from '@/shared/types/file.types';
import { projectService } from '@/server/services/project.service';

/**
 * File Service
 * Handles file system operations for project file browsing
 */
export class FileService {
  private readonly MAX_DEPTH = 10;
  private readonly EXCLUDED_DIRS = new Set([
    'node_modules',
    'dist',
    'build',
    '.git',
    '.next',
    'coverage',
    '.turbo',
  ]);

  constructor(private logger?: FastifyBaseLogger) {}

  /**
   * Get file tree for a project
   * @param projectId - Project ID
   * @returns File tree structure
   */
  async getProjectFiles(projectId: string): Promise<FileTreeItem[]> {
    // Look up project from database
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Validate that the path is accessible
    try {
      await fs.access(project.path);
    } catch {
      throw new Error('Project path is not accessible');
    }

    // Scan the directory
    const files = await this.scanDirectory(project.path, 0);

    // Sort: directories first, then alphabetically
    return this.sortFileTree(files);
  }

  /**
   * Recursively scan a directory
   * @param dirPath - Directory path to scan
   * @param depth - Current depth (for limiting recursion)
   * @returns Array of file tree items
   */
  private async scanDirectory(
    dirPath: string,
    depth: number = 0
  ): Promise<FileTreeItem[]> {
    // Limit recursion depth
    if (depth > this.MAX_DEPTH) {
      return [];
    }

    const items: FileTreeItem[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Skip excluded directories
        if (entry.isDirectory() && this.EXCLUDED_DIRS.has(entry.name)) {
          continue;
        }

        // Skip hidden files and directories (starting with .)
        if (entry.name.startsWith('.')) {
          continue;
        }

        try {
          // Get file stats for metadata
          const stats = await fs.stat(fullPath);

          const item: FileTreeItem = {
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: entry.isFile() ? stats.size : undefined,
            modified: stats.mtime,
            permissions: this.convertPermissions(stats.mode),
          };

          // Recursively scan subdirectories
          if (entry.isDirectory()) {
            item.children = await this.scanDirectory(fullPath, depth + 1);
          }

          items.push(item);
        } catch (error) {
          // Skip files/dirs with permission errors
          this.logger?.warn({ err: error, path: fullPath }, `Skipping ${fullPath} due to error`);
          continue;
        }
      }
    } catch (error) {
      // Handle permission errors gracefully
      this.logger?.warn({ err: error, path: dirPath }, `Cannot read directory ${dirPath}`);
    }

    return items;
  }

  /**
   * Sort file tree: directories first, then alphabetically
   * @param items - File tree items to sort
   * @returns Sorted file tree items
   */
  private sortFileTree(items: FileTreeItem[]): FileTreeItem[] {
    return items.sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;

      // Then alphabetically (case-insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  /**
   * Convert Unix permissions to rwx format
   * @param mode - File mode from fs.stats
   * @returns Permission string (e.g., "rw-r--r--")
   */
  private convertPermissions(mode: number): string {
    const perms = [
      (mode & 0o400) ? 'r' : '-',
      (mode & 0o200) ? 'w' : '-',
      (mode & 0o100) ? 'x' : '-',
      (mode & 0o040) ? 'r' : '-',
      (mode & 0o020) ? 'w' : '-',
      (mode & 0o010) ? 'x' : '-',
      (mode & 0o004) ? 'r' : '-',
      (mode & 0o002) ? 'w' : '-',
      (mode & 0o001) ? 'x' : '-',
    ];
    return perms.join('');
  }

  /**
   * Read file content
   * @param projectId - Project ID
   * @param filePath - File path relative to or absolute
   * @returns File content as string
   */
  async readFile(projectId: string, filePath: string): Promise<string> {
    // Look up project from database
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // If filePath is not absolute, make it relative to project path
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(project.path, filePath);

    // Validate that the file is within the project directory (security check)
    const normalizedProjectPath = path.resolve(project.path);
    const normalizedFilePath = path.resolve(absolutePath);

    // Check if file is within project directory or is a child of it
    const relativePath = path.relative(normalizedProjectPath, normalizedFilePath);
    const isOutside = relativePath.startsWith('..') || path.isAbsolute(relativePath);

    if (isOutside) {
      throw new Error('Access denied: File is outside project directory');
    }

    // Check if file exists and is accessible
    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch {
      throw new Error('File not found or not accessible');
    }

    // Read file content
    try {
      const content = await fs.readFile(absolutePath, 'utf-8');
      return content;
    } catch (error) {
      this.logger?.error({ err: error, path: absolutePath }, 'Error reading file');
      throw new Error('Failed to read file content');
    }
  }

  /**
   * Write file content
   * @param projectId - Project ID
   * @param filePath - File path relative to or absolute
   * @param content - File content to write
   * @returns Success status
   */
  async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
    // Look up project from database
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // If filePath is not absolute, make it relative to project path
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(project.path, filePath);

    // Validate that the file is within the project directory (security check)
    const normalizedProjectPath = path.resolve(project.path);
    const normalizedFilePath = path.resolve(absolutePath);

    // Check if file is within project directory or is a child of it
    const relativePath = path.relative(normalizedProjectPath, normalizedFilePath);
    const isOutside = relativePath.startsWith('..') || path.isAbsolute(relativePath);

    if (isOutside) {
      throw new Error('Access denied: File is outside project directory');
    }

    // Write file content
    try {
      await fs.writeFile(absolutePath, content, 'utf-8');
      this.logger?.info({ path: absolutePath }, 'File saved successfully');
    } catch (error) {
      this.logger?.error({ err: error, path: absolutePath }, 'Error writing file');
      throw new Error('Failed to write file content');
    }
  }
}

// Export a singleton instance
export const fileService = new FileService();
