import fs from 'fs/promises';
import path from 'path';
import type { FastifyBaseLogger } from 'fastify';
import { getProjectById } from '@/server/domain/project/services/getProjectById';

/**
 * Write file content
 * @param projectId - Project ID
 * @param filePath - File path relative to or absolute
 * @param content - File content to write
 * @param logger - Optional Fastify logger
 * @returns Success status
 */
export async function writeFile(
  projectId: string,
  filePath: string,
  content: string,
  logger?: FastifyBaseLogger
): Promise<void> {
  // Look up project from database
  const project = await getProjectById(projectId);

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
    logger?.info({ path: absolutePath }, 'File saved successfully');
  } catch (error) {
    logger?.error({ err: error, path: absolutePath }, 'Error writing file');
    throw new Error('Failed to write file content');
  }
}
