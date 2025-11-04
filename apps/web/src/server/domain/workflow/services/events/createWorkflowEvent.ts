import type { FastifyBaseLogger } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/prisma';
import type { WorkflowEvent, EventDataMap } from '@/server/domain/workflow/types';

export interface CreateWorkflowEventParams<T extends keyof EventDataMap = keyof EventDataMap> {
  workflow_execution_id: string;
  event_type: T;
  event_data: EventDataMap[T];
  workflow_execution_step_id?: string;
  created_by_user_id?: string;
  created_at?: Date; // Optional: allow custom timestamp (for step_started events)
  logger?: FastifyBaseLogger;
}

/**
 * Create a new workflow event
 * Centralized function for consistent event creation across all workflow operations
 */
export async function createWorkflowEvent<T extends keyof EventDataMap>(
  params: CreateWorkflowEventParams<T>
): Promise<WorkflowEvent> {
  const {
    workflow_execution_id,
    event_type,
    event_data,
    workflow_execution_step_id,
    created_by_user_id,
    created_at,
    logger,
  } = params;

  logger?.debug(
    {
      workflow_execution_id,
      event_type,
      workflow_execution_step_id,
    },
    'Creating workflow event'
  );

  const event = await prisma.workflowEvent.create({
    data: {
      workflow_execution_id,
      // @ts-ignore - event type
      event_type,
      event_data: event_data as unknown as Prisma.InputJsonValue,
      workflow_execution_step_id,
      created_by_user_id,
      ...(created_at && { created_at }),
    },
  });

  logger?.debug({ eventId: event.id }, 'Workflow event created');

  return event;
}
