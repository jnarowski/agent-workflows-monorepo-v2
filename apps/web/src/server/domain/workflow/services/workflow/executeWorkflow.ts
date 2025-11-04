import { prisma } from '@/shared/prisma';
import type { FastifyInstance } from 'fastify';

/**
 * Execute a workflow by triggering the Inngest workflow engine.
 * The engine will process steps asynchronously in the background.
 */
export async function executeWorkflow(
  executionId: string,
  fastifyOrWorkflowClient: FastifyInstance | { workflowClient?: { send: (event: { name: string; data: unknown }) => Promise<void> } },
  logger?: { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void }
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

  // Trigger workflow via Inngest using identifier with workflow/ prefix (Inngest convention)
  const eventName = `workflow/${execution.workflow_definition.identifier}`;
  const eventData = {
    executionId,
    projectId: execution.project_id,
    userId: execution.user_id,
    projectPath: execution.project.path,
    args: execution.args,
  };

  logger?.info(
    {
      executionId,
      eventName,
      workflowIdentifier: execution.workflow_definition.identifier,
      projectId: execution.project_id,
    },
    'Sending workflow execution event to Inngest'
  );

  try {
    await workflowClient.send({
      name: eventName,
      data: eventData,
    });

    logger?.info(
      { executionId, eventName },
      'Successfully sent workflow execution event to Inngest'
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger?.error(
      { err, executionId, eventName },
      'Failed to send workflow execution event to Inngest'
    );
    throw err;
  }

  // Returns immediately - workflow will be processed by Inngest in the background
}
