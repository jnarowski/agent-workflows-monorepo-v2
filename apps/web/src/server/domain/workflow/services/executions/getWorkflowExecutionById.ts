import { prisma } from '@/shared/prisma';
import type { WorkflowExecution } from '@prisma/client';

/**
 * Gets a single workflow execution by ID with all relations
 * Includes: steps (with agent sessions), events, workflow_definition, artifacts
 * Note: Artifacts are now organized by phase, not by step
 */
export async function getWorkflowExecutionById(id: string): Promise<WorkflowExecution | null> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id },
    include: {
      workflow_definition: true,
      steps: {
        include: {
          session: true, // Agent session relation
        },
        orderBy: { created_at: 'asc' },
      },
      events: true, // Include all events at execution level
    },
  });

  if (!execution) {
    return null;
  }

  // Fetch all artifacts for this execution (via event attachments OR via path pattern)
  // Since artifacts can be attached to events OR standalone, we need to fetch both
  const allArtifacts = await prisma.workflowArtifact.findMany({
    where: {
      OR: [
        // Artifacts attached to events in this execution
        {
          event: {
            workflow_execution_id: id,
          },
        },
        // Standalone artifacts by file path pattern (contains execution ID)
        {
          file_path: {
            contains: `executions/${id}/`,
          },
        },
      ],
    },
    orderBy: { created_at: 'asc' },
  });

  // Fetch all events for this execution
  const allEvents = await prisma.workflowEvent.findMany({
    where: {
      workflow_execution_id: id,
    },
    include: {
      created_by_user: {
        select: {
          id: true,
          email: true,
        },
      },
      artifacts: true,
    },
    orderBy: { created_at: 'asc' },
  });

  // Parse JSON fields (Prisma stores JSON as strings in SQLite)
  // Transform field names to match frontend types
  const parsedExecution = {
    ...execution,
    args: execution.args && typeof execution.args === 'string'
      ? JSON.parse(execution.args)
      : execution.args,
    workflowDefinition: execution.workflow_definition ? {
      ...execution.workflow_definition,
      phases: typeof execution.workflow_definition.phases === 'string'
        ? JSON.parse(execution.workflow_definition.phases)
        : execution.workflow_definition.phases,
      argsSchema: execution.workflow_definition.args_schema && typeof execution.workflow_definition.args_schema === 'string'
        ? JSON.parse(execution.workflow_definition.args_schema)
        : execution.workflow_definition.args_schema,
    } : execution.workflow_definition,
    // Transform steps to match frontend types (step_name, phase_name, logs)
    steps: execution.steps.map(step => ({
      ...step,
      stepName: step.name,
      phaseName: step.phase,
      logs: step.log_directory_path,
    })),
    // Use all events fetched separately
    events: allEvents.map(event => ({
      ...event,
      eventData: event.event_data && typeof event.event_data === 'string'
        ? JSON.parse(event.event_data)
        : event.event_data,
      artifacts: event.artifacts?.map(artifact => ({
        ...artifact,
        fileName: artifact.name,
      })),
    })),
    // Use all artifacts fetched separately (includes phase-level artifacts)
    artifacts: allArtifacts,
  };

  return parsedExecution as WorkflowExecution;
}
