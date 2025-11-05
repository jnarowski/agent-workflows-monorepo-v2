import { prisma } from '@/shared/prisma';
import type { WorkflowExecutionFilters } from '../../types';
import type { WorkflowExecution } from '@prisma/client';

/**
 * Query workflow executions with filters (optimized for list views)
 *
 * Returns minimal data for displaying executions in list/board views:
 * - 8 core fields (id, name, status, current_phase, workflow_definition_id, started_at, created_at)
 * - workflow_definition.name and workflow_definition.phases (for phase progress)
 * - _count.steps (for step count badge)
 *
 * This reduces payload size by ~95% compared to full nested data (500 bytes vs 10KB per execution)
 * For detail views, use `getWorkflowExecutionById` which fetches full nested data
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
    select: {
      id: true,
      name: true,
      status: true,
      current_phase: true,
      workflow_definition_id: true,
      started_at: true,
      created_at: true,
      workflow_definition: {
        select: {
          name: true,
          phases: true,
        },
      },
      _count: {
        select: {
          steps: true,
        },
      },
    },
    orderBy: [{ started_at: 'desc' }, { created_at: 'desc' }],
  });

  // Parse JSON fields (Prisma stores JSON as strings in SQLite)
  const parsedExecutions = executions.map((execution) => ({
    ...execution,
    workflow_definition: {
      name: execution.workflow_definition.name,
      phases: typeof execution.workflow_definition.phases === 'string'
        ? JSON.parse(execution.workflow_definition.phases)
        : execution.workflow_definition.phases,
    },
  }));

  return parsedExecutions as unknown as WorkflowExecution[];
}
