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

  // Parse JSON fields (Prisma stores JSON as strings in SQLite)
  const parsedExecutions = executions.map((execution) => ({
    ...execution,
    args: execution.args && typeof execution.args === 'string'
      ? JSON.parse(execution.args)
      : execution.args,
    workflow_definition: execution.workflow_definition ? {
      ...execution.workflow_definition,
      phases: typeof execution.workflow_definition.phases === 'string'
        ? JSON.parse(execution.workflow_definition.phases)
        : execution.workflow_definition.phases,
      args_schema: execution.workflow_definition.args_schema && typeof execution.workflow_definition.args_schema === 'string'
        ? JSON.parse(execution.workflow_definition.args_schema)
        : execution.workflow_definition.args_schema,
    } : execution.workflow_definition,
  }));

  return parsedExecutions as WorkflowExecution[];
}
