import { prisma } from '@/shared/prisma';
import type { WorkflowExecution } from '@prisma/client';

/**
 * Gets a single workflow execution by ID with all relations
 * Includes: steps (with agent sessions), comments, workflow_definition
 */
export async function getWorkflowExecutionById(id: string): Promise<WorkflowExecution | null> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id },
    include: {
      workflow_definition: true,
      steps: {
        include: {
          session: true, // Agent session relation
          artifacts: true,
          comments: true,
        },
        orderBy: { created_at: 'asc' },
      },
      comments: {
        include: {
          creator: {
            select: {
              id: true,
              email: true,
            },
          },
          artifacts: true,
        },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  if (!execution) {
    return null;
  }

  // Parse JSON fields (Prisma stores JSON as strings in SQLite)
  const parsedExecution = {
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
  };

  return parsedExecution as WorkflowExecution;
}
