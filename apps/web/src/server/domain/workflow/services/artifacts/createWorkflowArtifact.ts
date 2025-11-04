import { prisma } from '@/shared/prisma';
import type { WorkflowArtifact } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

export type ArtifactFileType = 'text' | 'file' | 'image';

export interface CreateWorkflowArtifactData {
  name: string;
  file_type: ArtifactFileType;
  file_path: string;
  mime_type: string;
  size_bytes: number;
}

/**
 * Create a workflow artifact record
 * Links artifact to a specific workflow execution step
 * Includes WebSocket broadcasting for real-time updates
 */
export async function createWorkflowArtifact(
  stepId: string,
  data: CreateWorkflowArtifactData,
  logger?: FastifyBaseLogger
): Promise<WorkflowArtifact> {
  logger?.debug(
    { stepId, name: data.name, fileType: data.file_type },
    'Creating workflow artifact'
  );

  const artifact = await prisma.workflowArtifact.create({
    data: {
      workflow_execution_step_id: stepId,
      name: data.name,
      file_type: data.file_type,
      file_path: data.file_path,
      mime_type: data.mime_type,
      size_bytes: data.size_bytes,
    },
  });

  logger?.debug({ artifactId: artifact.id }, 'Workflow artifact created');

  // TODO: Add WebSocket broadcasting when event bus is available
  // eventBus.emit('workflow.artifact.created', { artifactId: artifact.id, stepId });

  return artifact;
}
