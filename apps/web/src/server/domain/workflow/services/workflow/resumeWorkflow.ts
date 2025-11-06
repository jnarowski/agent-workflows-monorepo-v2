import { prisma } from "@/shared/prisma";
import type { WorkflowExecution } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { createWorkflowEvent } from "../events/createWorkflowEvent";
import { emitWorkflowEvent } from "../events/emitWorkflowEvent";

/**
 * STUB: Resume a paused workflow execution (future implementation)
 * Currently just updates status to 'running'
 * Logs warning that resume not implemented
 */
export async function resumeWorkflow(
  runId: string,
  userId?: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowExecution> {
  logger?.warn({ runId }, "Resume workflow not implemented - stubbed");

  const resumedAt = new Date();
  const execution = await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: "running",
      paused_at: null, // Clear paused_at when resuming
    },
  });

  // Create workflow_resumed event
  await createWorkflowEvent({
    workflow_run_id: runId,
    event_type: "workflow_resumed",
    event_data: {
      title: "Resumed",
      body: "Workflow execution resumed",
    },
    created_by_user_id: userId,
    created_at: resumedAt,
    logger,
  });

  // Emit WebSocket event immediately for real-time updates
  emitWorkflowEvent(execution.project_id, {
    type: 'workflow:execution:updated',
    data: {
      execution_id: execution.id,
      project_id: execution.project_id,
      changes: {
        status: 'running',
      },
    },
  });

  // Future: Resume execution from checkpoint
  return execution;
}
