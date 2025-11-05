import { useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { Channels } from "@/shared/websocket";
import {
  WorkflowWebSocketEventTypes,
  type WorkflowWebSocketEvent,
  type WorkflowExecutionUpdatedData,
  type WorkflowStepUpdatedData,
  type WorkflowEventCreatedData,
  type WorkflowArtifactCreatedData,
} from "@/shared/types/websocket.types";
import { toast } from "sonner";
import { debounce } from "@/client/lib/debounce";
import type {
  WorkflowExecutionListItem,
  WorkflowExecutionDetail,
  WorkflowEvent,
  WorkflowArtifact,
} from "../types";

export function useWorkflowWebSocket(projectId: string) {
  const { eventBus, sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  // Create debounced invalidation function (5s delay, resets on new events)
  // This provides a safety net if WebSocket drops events or optimistic update is incorrect
  const debouncedInvalidate = useMemo(
    () =>
      debounce((executionId: string) => {
        queryClient.invalidateQueries({
          queryKey: ["workflow-execution", executionId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workflow-executions", projectId],
        });
      }, 5000),
    [queryClient, projectId]
  );

  // Handler: workflow:execution:updated
  const handleExecutionUpdated = useCallback(
    (data: WorkflowExecutionUpdatedData) => {
      const { execution_id, changes } = data;

      // Convert date strings to Date objects
      const normalizedChanges: Partial<WorkflowExecutionDetail> = {};
      if (changes.status !== undefined) normalizedChanges.status = changes.status;
      if (changes.current_phase !== undefined) normalizedChanges.current_phase = changes.current_phase;
      if (changes.current_step !== undefined) normalizedChanges.current_step = changes.current_step;
      if (changes.error_message !== undefined) normalizedChanges.error_message = changes.error_message;
      if (changes.started_at !== undefined) normalizedChanges.started_at = new Date(changes.started_at);
      if (changes.completed_at !== undefined) normalizedChanges.completed_at = new Date(changes.completed_at);
      if (changes.updated_at !== undefined) normalizedChanges.updated_at = new Date(changes.updated_at);

      // Optimistic update: Update detail view (if cached)
      queryClient.setQueryData<WorkflowExecutionDetail>(
        ["workflow-execution", execution_id],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            ...normalizedChanges,
          };
        }
      );

      // Optimistic update: Update list view (if cached)
      queryClient.setQueriesData<WorkflowExecutionListItem[]>(
        { queryKey: ["workflow-executions", projectId] },
        (old) => {
          if (!old) return old;
          return old.map((exec) =>
            exec.id === execution_id
              ? {
                  ...exec,
                  ...normalizedChanges,
                }
              : exec
          );
        }
      );

      // Show toast for terminal states
      if (changes.status === "completed") {
        toast.success("Workflow completed successfully");
      } else if (changes.status === "failed") {
        toast.error(`Workflow failed: ${changes.error_message || "Unknown error"}`);
      } else if (changes.status === "cancelled") {
        toast.info("Workflow cancelled");
      }

      // Schedule background refetch (debounced)
      debouncedInvalidate(execution_id);
    },
    [queryClient, projectId, debouncedInvalidate]
  );

  // Handler: workflow:execution:step:updated
  const handleStepUpdated = useCallback(
    (data: WorkflowStepUpdatedData) => {
      const { execution_id, step_id, changes } = data;

      // Convert date strings to Date objects
      const normalizedChanges: Partial<{
        status: (typeof changes)["status"];
        logs: string | null;
        error_message: string | null;
        started_at: Date;
        completed_at: Date;
        updated_at: Date;
      }> = {};
      if (changes.status !== undefined) normalizedChanges.status = changes.status;
      if (changes.logs !== undefined) normalizedChanges.logs = changes.logs;
      if (changes.error_message !== undefined) normalizedChanges.error_message = changes.error_message;
      if (changes.started_at !== undefined) normalizedChanges.started_at = new Date(changes.started_at);
      if (changes.completed_at !== undefined) normalizedChanges.completed_at = new Date(changes.completed_at);
      if (changes.updated_at !== undefined) normalizedChanges.updated_at = new Date(changes.updated_at);

      // Optimistic update: Update detail view (if cached)
      queryClient.setQueryData<WorkflowExecutionDetail>(
        ["workflow-execution", execution_id],
        (old) => {
          if (!old || !old.steps) return old;
          return {
            ...old,
            steps: old.steps.map((step) =>
              step.id === step_id
                ? {
                    ...step,
                    ...normalizedChanges,
                  }
                : step
            ),
          };
        }
      );

      // Show toast for step failures
      if (changes.status === "failed") {
        toast.error(`Step failed: ${changes.error_message || "Unknown error"}`);
      }

      // Schedule background refetch (debounced)
      debouncedInvalidate(execution_id);
    },
    [queryClient, debouncedInvalidate]
  );

  // Handler: workflow:execution:event:created
  const handleEventCreated = useCallback(
    (data: WorkflowEventCreatedData) => {
      const { execution_id, event } = data;

      // Convert dates to Date objects and ensure proper types
      const newEvent: WorkflowEvent = {
        ...event,
        event_type: event.event_type as WorkflowEvent["event_type"],
        created_at: new Date(event.created_at),
        inngest_step_id: event.inngest_step_id ?? null,
      };

      // Optimistic update: Add event to detail view (if cached)
      queryClient.setQueryData<WorkflowExecutionDetail>(
        ["workflow-execution", execution_id],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            events: old.events ? [...old.events, newEvent] : [newEvent],
          };
        }
      );

      // Schedule background refetch (debounced)
      debouncedInvalidate(execution_id);
    },
    [queryClient, debouncedInvalidate]
  );

  // Handler: workflow:execution:artifact:created
  const handleArtifactCreated = useCallback(
    (data: WorkflowArtifactCreatedData) => {
      const { execution_id, artifact } = data;

      // Convert dates to Date objects
      const newArtifact: WorkflowArtifact = {
        ...artifact,
        created_at: new Date(artifact.created_at),
        inngest_step_id: artifact.inngest_step_id ?? null,
      };

      // Optimistic update: Add artifact to detail view (if cached)
      queryClient.setQueryData<WorkflowExecutionDetail>(
        ["workflow-execution", execution_id],
        (old) => {
          if (!old) return old;

          // If artifact belongs to a step, update that step's artifacts
          if (artifact.workflow_execution_step_id && old.steps) {
            const updatedSteps = old.steps.map((step) =>
              step.id === artifact.workflow_execution_step_id
                ? {
                    ...step,
                    artifacts: step.artifacts
                      ? [...step.artifacts, newArtifact]
                      : [newArtifact],
                  }
                : step
            );
            return {
              ...old,
              steps: updatedSteps,
              artifacts: old.artifacts ? [...old.artifacts, newArtifact] : [newArtifact],
            };
          }

          // Otherwise, just add to top-level artifacts
          return {
            ...old,
            artifacts: old.artifacts ? [...old.artifacts, newArtifact] : [newArtifact],
          };
        }
      );

      // Schedule background refetch (debounced)
      debouncedInvalidate(execution_id);
    },
    [queryClient, debouncedInvalidate]
  );

  // Main event handler
  const handleWorkflowEvent = useCallback(
    (event: WorkflowWebSocketEvent) => {
      switch (event.type) {
        case WorkflowWebSocketEventTypes.EXECUTION_UPDATED:
          handleExecutionUpdated(event.data);
          break;
        case WorkflowWebSocketEventTypes.STEP_UPDATED:
          handleStepUpdated(event.data);
          break;
        case WorkflowWebSocketEventTypes.EVENT_CREATED:
          handleEventCreated(event.data);
          break;
        case WorkflowWebSocketEventTypes.ARTIFACT_CREATED:
          handleArtifactCreated(event.data);
          break;
        default: {
          // Exhaustive check: if we get here, TypeScript will error
          const _exhaustiveCheck: never = event;
          console.warn("Unknown workflow event type:", _exhaustiveCheck);
        }
      }
    },
    [handleExecutionUpdated, handleStepUpdated, handleEventCreated, handleArtifactCreated]
  );

  useEffect(() => {
    if (!projectId || !isConnected) return;

    // Subscribe to project channel
    const channel = Channels.project(projectId);
    sendMessage(channel, { type: "subscribe", data: {} });

    // Register event handler
    eventBus.on(channel, handleWorkflowEvent);

    // Cleanup
    return () => {
      eventBus.off(channel, handleWorkflowEvent);
    };
  }, [projectId, isConnected, eventBus, sendMessage, handleWorkflowEvent]);
}
