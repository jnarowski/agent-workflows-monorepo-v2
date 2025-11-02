import { prisma } from '@/shared/prisma';
import type { WorkflowExecutionFilters } from '../types';
import type { WorkflowExecution } from '@prisma/client';

/**
 * Query workflow executions with filters
 * Includes: steps, workflow_definition, counts for comments/artifacts
 * Orders by started_at desc (or created_at if not started)
 */
export async function getWorkflowExecutions(
  filters: WorkflowExecutionFilters
): Promise<WorkflowExecution[]> {
  const executions = await prisma.workflowExecution.findMany({
    where: {
      ...(filters.project_id && { project_id: filters.project_id }),
      ...(filters.user_id && { user_id: filters.user_id }),
      ...(filters.status && { status: filters.status }),
    },
    include: {
      workflow_definition: true,
      steps: {
        orderBy: { created_at: 'asc' },
      },
      _count: {
        select: {
          comments: true,
          steps: true,
        },
      },
    },
    orderBy: [{ started_at: 'desc' }, { created_at: 'desc' }],
  });

  return executions;
}
