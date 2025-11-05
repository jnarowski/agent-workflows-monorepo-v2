import { prisma } from '@/shared/prisma';
import type { WorkflowExecutionStep } from '@prisma/client';

/**
 * Get a workflow execution step by ID
 * Includes: agent session
 */
export async function getWorkflowStepById(id: string): Promise<WorkflowExecutionStep | null> {
  const step = await prisma.workflowExecutionStep.findUnique({
    where: { id },
    include: {
      session: true, // Agent session if present
    },
  });

  return step;
}
