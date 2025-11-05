import type { WorkflowArtifact } from "@prisma/client";
import { emitWorkflowEvent } from "../../../events/emitWorkflowEvent";

/**
 * Emit artifact:created event for a workflow artifact
 *
 * @param projectId - Project ID for event routing
 * @param executionId - Workflow execution ID
 * @param artifact - Created artifact record
 *
 * @example
 * ```typescript
 * const artifact = await createWorkflowArtifact({ ... });
 * emitArtifactCreatedEvent(projectId, executionId, artifact);
 * ```
 */
export function emitArtifactCreatedEvent(
  projectId: string,
  executionId: string,
  artifact: WorkflowArtifact
): void {
  emitWorkflowEvent(projectId, {
    type: "workflow:execution:artifact:created",
    data: {
      execution_id: executionId,
      artifact: {
        id: artifact.id,
        workflow_execution_id: artifact.workflow_execution_id,
        workflow_execution_step_id: null,
        workflow_event_id: artifact.workflow_event_id,
        name: artifact.name,
        file_path: artifact.file_path,
        file_type: artifact.file_type,
        mime_type: artifact.mime_type,
        size_bytes: artifact.size_bytes,
        phase: artifact.phase,
        inngest_step_id: artifact.inngest_step_id,
        created_at: artifact.created_at,
      },
    },
  });
}
