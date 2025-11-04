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
import type { WorkflowEvent } from "@/shared/websocket/types";

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
      event: Extract<WorkflowEvent, { type: "workflow:started" }>
    ) => {
      handleWorkflowStarted({ executionId: event.data.executionId });
      applyIncrementalUpdate(event.data.executionId, {
        type: "workflow_status_updated",
        status: "running",
      });
    };

    // Step started
    const handleStepStart = (
      event: Extract<
        WorkflowEvent,
        { type: "workflow:step:started" }
      >
    ) => {
      handleStepStarted({
        executionId: event.data.executionId,
        stepId: event.data.stepId,
        stepName: event.data.stepName,
        phaseName: event.data.phase,
      });
      applyIncrementalUpdate(event.data.executionId, {
        type: "step_started",
        stepId: event.data.stepId,
        startedAt: new Date(event.data.timestamp),
        stepName: event.data.stepName,
      });
    };

    // Step completed
    const handleStepComplete = (
      event: Extract<
        WorkflowEvent,
        { type: "workflow:step:completed" }
      >
    ) => {
      handleStepCompleted({
        executionId: event.data.executionId,
        stepId: event.data.stepId,
        logs: event.data.logs,
      });
      applyIncrementalUpdate(event.data.executionId, {
        type: "step_completed",
        stepId: event.data.stepId,
        completedAt: new Date(event.data.timestamp),
        logs: event.data.logs,
      });
    };

    // Step failed
    const handleStepFail = (
      event: Extract<WorkflowEvent, { type: "workflow:step:failed" }>
    ) => {
      handleStepFailed({
        executionId: event.data.executionId,
        stepId: event.data.stepId,
        error: event.data.error,
      });
      applyIncrementalUpdate(event.data.executionId, {
        type: "step_failed",
        stepId: event.data.stepId,
        completedAt: new Date(event.data.timestamp),
        errorMessage: event.data.error,
      });
      toast.error(`Step failed: ${event.data.stepName}`);
    };

    // Phase completed
    const handlePhaseComplete = (
      event: Extract<
        WorkflowEvent,
        { type: "workflow:phase:completed" }
      >
    ) => {
      handlePhaseCompleted({
        executionId: event.data.executionId,
        phaseName: event.data.phase,
        nextPhase: null, // TODO: Backend should provide nextPhase
      });
      // Phase completion may need to trigger other updates, but for now we can skip
      // since the domain model rebuilds the timeline from all events
    };

    // Workflow completed
    const handleComplete = (
      event: Extract<WorkflowEvent, { type: "workflow:completed" }>
    ) => {
      handleWorkflowCompleted({ executionId: event.data.executionId });
      applyIncrementalUpdate(event.data.executionId, {
        type: "workflow_status_updated",
        status: "completed",
        completedAt: new Date(event.data.timestamp),
      });
      // Invalidate list to update workflow status
      queryClient.invalidateQueries({
        queryKey: ["workflow-executions", projectId],
      });
      toast.success("Workflow completed successfully");
    };

    // Workflow failed
    const handleFail = (
      event: Extract<WorkflowEvent, { type: "workflow:failed" }>
    ) => {
      handleWorkflowFailed({
        executionId: event.data.executionId,
        error: event.data.error,
      });
      applyIncrementalUpdate(event.data.executionId, {
        type: "workflow_status_updated",
        status: "failed",
        completedAt: new Date(event.data.timestamp),
        errorMessage: event.data.error,
      });
      // Invalidate list to update workflow status
      queryClient.invalidateQueries({
        queryKey: ["workflow-executions", projectId],
      });
      toast.error(`Workflow failed: ${event.data.error}`);
    };

    // Workflow paused
    const handlePause = (
      event: Extract<WorkflowEvent, { type: "workflow:paused" }>
    ) => {
      handleWorkflowPaused({ executionId: event.data.executionId });
      applyIncrementalUpdate(event.data.executionId, {
        type: "workflow_status_updated",
        status: "paused",
      });
    };

    // Workflow resumed
    const handleResume = (
      event: Extract<WorkflowEvent, { type: "workflow:resumed" }>
    ) => {
      handleWorkflowResumed({ executionId: event.data.executionId });
      applyIncrementalUpdate(event.data.executionId, {
        type: "workflow_status_updated",
        status: "running",
      });
    };

    // Workflow cancelled
    const handleCancel = (
      event: Extract<WorkflowEvent, { type: "workflow:cancelled" }>
    ) => {
      handleWorkflowCancelled({ executionId: event.data.executionId });
      applyIncrementalUpdate(event.data.executionId, {
        type: "workflow_status_updated",
        status: "cancelled",
        completedAt: new Date(event.data.timestamp),
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
        WorkflowEvent,
        { type: "workflow:annotation:created" }
      >
    ) => {
      // Create WorkflowEvent for the annotation
      const annotationEvent = {
        id: event.data.commentId,
        workflow_execution_id: event.data.executionId,
        workflow_execution_step_id: event.data.stepId || null,
        event_type: "annotation_added" as const,
        event_data: {
          title: "Annotation Added",
          body: event.data.text || event.data.body || "",
        },
        created_by_user_id: event.data.userId || null,
        created_at: new Date(event.data.timestamp),
      };

      handleEventCreated({
        executionId: event.data.executionId,
        event: annotationEvent,
      });

      applyIncrementalUpdate(event.data.executionId, {
        type: "annotation_added",
        annotationId: event.data.commentId,
        text: event.data.text || event.data.body || "",
        stepId: event.data.stepId || undefined,
        userId: event.data.userId || null,
        createdAt: new Date(event.data.timestamp),
      });
    };

    // Single event handler that dispatches by event type
    const handleWorkflowEvent = (event: WorkflowEvent) => {
      switch (event.type) {
        case WorkflowEventTypes.CREATED:
          handleCreated();
          break;
        case WorkflowEventTypes.STARTED:
          handleStarted(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:started" }
            >
          );
          break;
        case WorkflowEventTypes.STEP_STARTED:
          handleStepStart(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:step:started" }
            >
          );
          break;
        case WorkflowEventTypes.STEP_COMPLETED:
          handleStepComplete(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:step:completed" }
            >
          );
          break;
        case WorkflowEventTypes.STEP_FAILED:
          handleStepFail(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:step:failed" }
            >
          );
          break;
        case WorkflowEventTypes.PHASE_COMPLETED:
          handlePhaseComplete(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:phase:completed" }
            >
          );
          break;
        case WorkflowEventTypes.COMPLETED:
          handleComplete(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:completed" }
            >
          );
          break;
        case WorkflowEventTypes.FAILED:
          handleFail(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:failed" }
            >
          );
          break;
        case WorkflowEventTypes.PAUSED:
          handlePause(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:paused" }
            >
          );
          break;
        case WorkflowEventTypes.RESUMED:
          handleResume(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:resumed" }
            >
          );
          break;
        case WorkflowEventTypes.CANCELLED:
          handleCancel(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:cancelled" }
            >
          );
          break;
        case WorkflowEventTypes.ANNOTATION_CREATED:
          handleAnnotation(
            event as Extract<
              WorkflowEvent,
              { type: "workflow:annotation:created" }
            >
          );
          break;
      }
    };

    eventBus.on(channel, handleWorkflowEvent);

    // Cleanup
    return () => {
      eventBus.off(channel, handleWorkflowEvent);
    };
    // Zustand store functions (handle*, setConnected) are stable and omitted per convention
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isConnected, eventBus, sendMessage, queryClient]);
}
