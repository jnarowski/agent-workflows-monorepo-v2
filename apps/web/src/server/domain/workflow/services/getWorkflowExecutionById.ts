import { prisma } from '@/shared/prisma';
import type { WorkflowExecution } from '@prisma/client';

/**
 * Gets a single workflow execution by ID with all relations
 * Includes: steps (with agent sessions), events, workflow_definition
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
        },
        orderBy: { created_at: 'asc' },
      },
      events: {
        include: {
          created_by_user: {
            select: {
              id: true,
              email: true,
            },
          },
          artifacts: true,
          step: true, // Include step relation for step-level events
        },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  if (!execution) {
    return null;
  }

  // Parse JSON fields (Prisma stores JSON as strings in SQLite)
  // Transform field names to match frontend types
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
    // Transform steps to match frontend types (step_name, phase_name, logs)
    steps: execution.steps.map(step => ({
      ...step,
      step_name: step.name,
      phase_name: step.phase,
      logs: step.log_directory_path,
    })),
    // Transform events to match frontend types (parse event_data JSON, artifact name -> file_name)
    events: execution.events.map(event => ({
      ...event,
      event_data: event.event_data && typeof event.event_data === 'string'
        ? JSON.parse(event.event_data)
        : event.event_data,
      artifacts: event.artifacts?.map(artifact => ({
        ...artifact,
        file_name: artifact.name,
      })),
    })),
  };

  return parsedExecution as WorkflowExecution;
}
