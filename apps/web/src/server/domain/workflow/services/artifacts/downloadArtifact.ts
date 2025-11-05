import { prisma } from '@/shared/prisma';
import * as path from 'node:path';
import type { WorkflowArtifact } from '@prisma/client';

/**
 * Get artifact by ID and resolve absolute file path
 * Returns artifact metadata + absolute file path for streaming
 * Returns null if artifact not found
 *
 * Note: Artifacts are organized by phase, not by step.
 * We use the event's execution to find the project path, or query executions if no event attached.
 */
export async function downloadArtifact(
  id: string
): Promise<{ artifact: WorkflowArtifact; filePath: string } | null> {
  const artifact = await prisma.workflowArtifact.findUnique({
    where: { id },
    include: {
      event: {
        include: {
          workflow_execution: {
            include: {
              project: true,
            },
          },
        },
      },
    },
  });

  if (!artifact) {
    return null;
  }

  // Get project path - either from event or find execution by artifact path pattern
  let projectPath: string;

  if (artifact.event) {
    projectPath = artifact.event.workflow_execution.project.path;
  } else {
    // Parse execution ID from file path (.agent/workflows/executions/{executionId}/...)
    const match = artifact.file_path.match(/\.agent\/workflows\/executions\/([^/]+)\//);
    if (!match) {
      throw new Error('Cannot determine execution from artifact path');
    }

    const executionId = match[1];
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: { project: true },
    });

    if (!execution) {
      return null;
    }

    projectPath = execution.project.path;
  }

  // Resolve absolute file path
  const absoluteFilePath = path.resolve(projectPath, artifact.file_path);

  // Security: Validate path is within project directory
  if (!absoluteFilePath.startsWith(projectPath)) {
    throw new Error('Invalid file path - outside project directory');
  }

  return {
    artifact,
    filePath: absoluteFilePath,
  };
}
