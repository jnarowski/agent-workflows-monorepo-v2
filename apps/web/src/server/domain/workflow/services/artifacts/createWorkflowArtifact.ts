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
  phase: string;
}

/**
 * Create a workflow artifact record
 * Artifacts are organized by phase (not by step)
 * Includes WebSocket broadcasting for real-time updates
 */
export async function createWorkflowArtifact(
  data: CreateWorkflowArtifactData,
  logger?: FastifyBaseLogger
): Promise<WorkflowArtifact> {
  logger?.debug(
    { name: data.name, fileType: data.file_type, phase: data.phase },
    'Creating workflow artifact'
  );

  const artifact = await prisma.workflowArtifact.create({
    data: {
      name: data.name,
      file_type: data.file_type,
      file_path: data.file_path,
      mime_type: data.mime_type,
      size_bytes: data.size_bytes,
      phase: data.phase,
    },
  });

  logger?.debug({ artifactId: artifact.id, phase: data.phase }, 'Workflow artifact created');

  // TODO: Add WebSocket broadcasting when event bus is available
  // eventBus.emit('workflow.artifact.created', { artifactId: artifact.id, phase: data.phase });

  return artifact;
}
