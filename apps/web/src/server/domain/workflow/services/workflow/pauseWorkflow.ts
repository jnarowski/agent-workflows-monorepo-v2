import { prisma } from "@/shared/prisma";
import type { WorkflowExecution } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { createWorkflowEvent } from "../events/createWorkflowEvent";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { WorkflowEventTypes } from "@/shared/types/websocket.types";
import { Channels } from "@/shared/websocket";

/**
 * Pauses a running workflow execution
 * Updates status to 'paused' and sets paused_at timestamp
 */
export async function pauseWorkflow(
  executionId: string,
  userId?: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowExecution> {
  const pausedAt = new Date();
  const execution = await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: "paused",
      paused_at: pausedAt,
    },
  });

  // Create workflow_paused event
  await createWorkflowEvent({
    workflow_execution_id: executionId,
    event_type: "workflow_paused",
    event_data: {
      title: "Paused",
      body: "Workflow execution paused",
    },
    created_by_user_id: userId,
    created_at: pausedAt,
    logger,
  });

  // Emit WebSocket event immediately for real-time updates
  broadcast(Channels.project(execution.project_id), {
    type: WorkflowEventTypes.PAUSED,
    data: {
      executionId: execution.id,
      projectId: execution.project_id,
      timestamp: pausedAt.toISOString(),
    },
  });

  return execution;
}
