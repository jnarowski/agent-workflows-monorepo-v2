import { prisma } from '@/shared/prisma';
import type { FastifyInstance } from 'fastify';

/**
 * Execute a workflow by triggering the Inngest workflow engine.
 * The engine will process steps asynchronously in the background.
 */
export async function executeWorkflow(
  executionId: string,
  fastifyOrWorkflowClient: FastifyInstance | { workflowClient?: { send: (event: { name: string; data: unknown }) => Promise<void> } }
): Promise<void> {
  // Get execution details
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      workflow_definition: true,
      project: true,
    },
  });

  if (!execution) {
    throw new Error(`Workflow execution ${executionId} not found`);
  }

  if (!execution.workflow_definition) {
    throw new Error(`Workflow definition not found for execution ${executionId}`);
  }

  // Update execution status to pending (queued for processing)
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'pending',
      started_at: new Date(),
    },
  });

  // Get workflow client
  const workflowClient = 'workflowClient' in fastifyOrWorkflowClient
    ? fastifyOrWorkflowClient.workflowClient
    : (fastifyOrWorkflowClient as { workflowClient?: { send: (event: { name: string; data: unknown }) => Promise<void> } }).workflowClient;

  if (!workflowClient) {
    throw new Error('Workflow client not initialized. Please initialize workflow engine first.');
  }

  // Trigger workflow via Inngest
  await workflowClient.send({
    name: execution.workflow_definition.name,
    data: {
      executionId,
      projectId: execution.project_id,
      userId: execution.user_id,
      projectPath: execution.project.path,
      args: execution.args,
    },
  });

  // Returns immediately - workflow will be processed by Inngest in the background
}
