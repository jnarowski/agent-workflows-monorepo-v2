import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { Channels } from "@/shared/websocket";
import { WorkflowEventTypes } from "@/shared/websocket/types";
import { useWorkflowStore } from "../stores/workflowStore";
import { toast } from "sonner";
import {
  applyWorkflowUpdate,
  type WebSocketUpdate,
} from "../lib/applyWorkflowUpdate";
import type { WorkflowExecution } from "../types";
import type { WorkflowWebSocketMessage } from "@/shared/websocket/workflow.schemas";

export function useWorkflowWebSocket(projectId: string) {
  const { eventBus, sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  // Get store actions
  const {
    handleWorkflowStarted,
    handleStepStarted,
    handleStepCompleted,
    handleStepFailed,
    handlePhaseCompleted,
    handleWorkflowCompleted,
    handleWorkflowFailed,
    handleWorkflowPaused,
    handleWorkflowResumed,
    handleWorkflowCancelled,
    handleEventCreated,
    setConnected,
  } = useWorkflowStore();

  useEffect(() => {
    if (!projectId || !isConnected) return;

    // Update connection status
    setConnected(isConnected);

    // Subscribe to project channel
    const channel = Channels.project(projectId);
    sendMessage(channel, { type: "subscribe", data: {} });

    // Helper function to apply incremental update to cached execution
    const applyIncrementalUpdate = (
      executionId: string,
      update: WebSocketUpdate
    ) => {
      queryClient.setQueryData<WorkflowExecution>(
        ["workflow-execution", executionId],
        (oldData) => {
          if (!oldData) return oldData;
          return applyWorkflowUpdate(oldData, update);
        }
      );
    };

    // Workflow created
    const handleCreated = () => {
      // Invalidate list to show new workflow - backend creates execution
      queryClient.invalidateQueries({
        queryKey: ["workflow-executions", projectId],
      });
    };

    // Workflow started
    const handleStarted = (
      event: Extract<WorkflowWebSocketMessage, { type: "workflow:started" }>
    ) => {
      handleWorkflowStarted({ executionId: event.executionId });
      applyIncrementalUpdate(event.executionId, {
        type: "workflow_status_updated",
        status: "running",
      });
    };

    // Step started
    const handleStepStart = (
      event: Extract<
        WorkflowWebSocketMessage,
        { type: "workflow:step:started" }
      >
    ) => {
      handleStepStarted({
        executionId: event.executionId,
        stepId: event.data.stepId,
        stepName: event.data.stepName,
        phaseName: event.data.phase || "unknown",
      });
      applyIncrementalUpdate(event.executionId, {
        type: "step_started",
        stepId: event.data.stepId,
        startedAt: new Date(event.timestamp),
        stepName: event.data.stepName,
      });
    };

    // Step completed
    const handleStepComplete = (
      event: Extract<
        WorkflowWebSocketMessage,
        { type: "workflow:step:completed" }
      >
    ) => {
      handleStepCompleted({
        executionId: event.executionId,
        stepId: event.data.stepId,
        logs: event.data.logs || "",
      });
      applyIncrementalUpdate(event.executionId, {
        type: "step_completed",
        stepId: event.data.stepId,
        completedAt: new Date(event.timestamp),
        logs: event.data.logs,
      });
    };

    // Step failed
    const handleStepFail = (
      event: Extract<WorkflowWebSocketMessage, { type: "workflow:step:failed" }>
    ) => {
      handleStepFailed({
        executionId: event.executionId,
        stepId: event.data.stepId,
        error: event.data.error,
      });
      applyIncrementalUpdate(event.executionId, {
        type: "step_failed",
        stepId: event.data.stepId,
        completedAt: new Date(event.timestamp),
        errorMessage: event.data.error,
      });
      toast.error(`Step failed: ${event.data.stepName || "Unknown step"}`);
    };

    // Phase completed
    const handlePhaseComplete = (
      event: Extract<
        WorkflowWebSocketMessage,
        { type: "workflow:phase:completed" }
      >
    ) => {
      handlePhaseCompleted({
        executionId: event.executionId,
        phaseName: event.data.phaseName,
        nextPhase: null, // TODO: Backend should provide nextPhase
      });
      // Phase completion may need to trigger other updates, but for now we can skip
      // since the domain model rebuilds the timeline from all events
    };

    // Workflow completed
    const handleComplete = (
      event: Extract<WorkflowWebSocketMessage, { type: "workflow:completed" }>
    ) => {
      handleWorkflowCompleted({ executionId: event.executionId });
      applyIncrementalUpdate(event.executionId, {
        type: "workflow_status_updated",
        status: "completed",
        completedAt: new Date(event.timestamp),
      });
      // Invalidate list to update workflow status
      queryClient.invalidateQueries({
        queryKey: ["workflow-executions", projectId],
      });
      toast.success("Workflow completed successfully");
    };

    // Workflow failed
    const handleFail = (
      event: Extract<WorkflowWebSocketMessage, { type: "workflow:failed" }>
    ) => {
      handleWorkflowFailed({
        executionId: event.executionId,
        error: event.data.error,
      });
      applyIncrementalUpdate(event.executionId, {
        type: "workflow_status_updated",
        status: "failed",
        completedAt: new Date(event.timestamp),
        errorMessage: event.data.error,
      });
      // Invalidate list to update workflow status
      queryClient.invalidateQueries({
        queryKey: ["workflow-executions", projectId],
      });
      toast.error(`Workflow failed: ${event.data.error || "Unknown error"}`);
    };

    // Workflow paused
    const handlePause = (
      event: Extract<WorkflowWebSocketMessage, { type: "workflow:paused" }>
    ) => {
      handleWorkflowPaused({ executionId: event.executionId });
      applyIncrementalUpdate(event.executionId, {
        type: "workflow_status_updated",
        status: "paused",
      });
    };

    // Workflow resumed
    const handleResume = (
      event: Extract<WorkflowWebSocketMessage, { type: "workflow:resumed" }>
    ) => {
      handleWorkflowResumed({ executionId: event.executionId });
      applyIncrementalUpdate(event.executionId, {
        type: "workflow_status_updated",
        status: "running",
      });
    };

    // Workflow cancelled
    const handleCancel = (
      event: Extract<WorkflowWebSocketMessage, { type: "workflow:cancelled" }>
    ) => {
      handleWorkflowCancelled({ executionId: event.executionId });
      applyIncrementalUpdate(event.executionId, {
        type: "workflow_status_updated",
        status: "cancelled",
        completedAt: new Date(event.timestamp),
      });
      // Invalidate list to update workflow status
      queryClient.invalidateQueries({
        queryKey: ["workflow-executions", projectId],
      });
      toast.info("Workflow cancelled");
    };

    // Annotation created
    const handleAnnotation = (
      event: Extract<
        WorkflowWebSocketMessage,
        { type: "workflow:annotation:created" }
      >
    ) => {
      // Create WorkflowEvent for the annotation
      const annotationEvent = {
        id: event.data.commentId,
        workflow_execution_id: event.executionId,
        workflow_execution_step_id: event.data.stepId || null,
        event_type: "annotation_added" as const,
        event_data: {
          title: "Annotation Added",
          body: event.data.text || event.data.body || "",
        },
        created_by_user_id: event.data.userId || null,
        created_at: new Date(event.timestamp),
      };

      handleEventCreated({
        executionId: event.executionId,
        event: annotationEvent,
      });

      applyIncrementalUpdate(event.executionId, {
        type: "annotation_added",
        annotationId: event.data.commentId,
        text: event.data.text || event.data.body || "",
        stepId: event.data.stepId || undefined,
        userId: event.data.userId || null,
        createdAt: new Date(event.timestamp),
      });
    };

    // Single event handler that dispatches by event type
    const handleWorkflowEvent = (event: WorkflowWebSocketMessage) => {
      switch (event.type) {
        case WorkflowEventTypes.CREATED:
          handleCreated();
          break;
        case WorkflowEventTypes.STARTED:
          handleStarted(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:started" }
            >
          );
          break;
        case WorkflowEventTypes.STEP_STARTED:
          handleStepStart(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:step:started" }
            >
          );
          break;
        case WorkflowEventTypes.STEP_COMPLETED:
          handleStepComplete(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:step:completed" }
            >
          );
          break;
        case WorkflowEventTypes.STEP_FAILED:
          handleStepFail(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:step:failed" }
            >
          );
          break;
        case WorkflowEventTypes.PHASE_COMPLETED:
          handlePhaseComplete(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:phase:completed" }
            >
          );
          break;
        case WorkflowEventTypes.COMPLETED:
          handleComplete(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:completed" }
            >
          );
          break;
        case WorkflowEventTypes.FAILED:
          handleFail(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:failed" }
            >
          );
          break;
        case WorkflowEventTypes.PAUSED:
          handlePause(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:paused" }
            >
          );
          break;
        case WorkflowEventTypes.RESUMED:
          handleResume(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:resumed" }
            >
          );
          break;
        case WorkflowEventTypes.CANCELLED:
          handleCancel(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:cancelled" }
            >
          );
          break;
        case WorkflowEventTypes.ANNOTATION_CREATED:
          handleAnnotation(
            event as Extract<
              WorkflowWebSocketMessage,
              { type: "workflow:annotation:created" }
            >
          );
          break;
      }
    };

    // Type assertion needed because WorkflowWebSocketMessage has additional fields
    // (executionId, projectId, timestamp) beyond ChannelEvent's { type, data } structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventBus.on(channel, handleWorkflowEvent as any);

    // Cleanup
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventBus.off(channel, handleWorkflowEvent as any);
    };
    // Zustand store functions (handle*, setConnected) are stable and omitted per convention
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isConnected, eventBus, sendMessage, queryClient]);
}
