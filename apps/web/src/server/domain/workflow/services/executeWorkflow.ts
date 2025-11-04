import { prisma } from '@/shared/prisma';
import type { MockWorkflowOrchestrator } from './MockWorkflowOrchestrator';

/**
 * Execute a workflow by delegating to the MockWorkflowOrchestrator.
 * The orchestrator will process steps asynchronously in the background.
 */
export async function executeWorkflow(
  executionId: string,
  orchestrator: MockWorkflowOrchestrator
): Promise<void> {
  // Update execution status to pending (queued for processing)
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'pending',
      started_at: new Date(),
    },
  });

  // Execute workflow asynchronously (no queue needed)
  await orchestrator.executeWorkflow(executionId);

  // Returns immediately - workflow will be processed in the background
}
