/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/client/hooks/useWebSocket';
import { Channels } from '@/shared/websocket';
import { WorkflowEventTypes } from '@/shared/websocket/types';
import { useWorkflowStore } from '../stores/workflowStore';
import { toast } from 'sonner';
import { applyWorkflowUpdate, type WebSocketUpdate } from '../lib/applyWorkflowUpdate';
import type { WorkflowExecution } from '../types';

export function useWorkflowWebSocket(projectId: string) {
  const { eventBus, sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  // Get store actions
  const {
    handleWorkflowCreated,
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
    handleCommentCreated,
    setConnected,
  } = useWorkflowStore();

  useEffect(() => {
    if (!projectId || !isConnected) return;

    // Update connection status
    setConnected(isConnected);

    // Subscribe to project channel
    const channel = Channels.project(projectId);
    sendMessage(channel, { type: 'subscribe', data: {} });

    // Helper function to apply incremental update to cached execution
    const applyIncrementalUpdate = (executionId: string, update: WebSocketUpdate) => {
      queryClient.setQueryData<WorkflowExecution>(
        ['workflow-execution', executionId],
        (oldData) => {
          if (!oldData) return oldData;
          return applyWorkflowUpdate(oldData, update);
        }
      );
    };

    // Workflow created
    const handleCreated = (event: any) => {
      handleWorkflowCreated(event.data);
      // Invalidate list to show new workflow
      queryClient.invalidateQueries({
        queryKey: ['workflow-executions', projectId],
      });
    };

    // Workflow started
    const handleStarted = (event: any) => {
      handleWorkflowStarted(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'workflow_status_updated',
        status: 'running',
      });
    };

    // Step started
    const handleStepStart = (event: any) => {
      handleStepStarted(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'step_started',
        stepId: event.data.stepId,
        startedAt: new Date(event.data.timestamp),
        stepName: event.data.stepName,
      });
    };

    // Step completed
    const handleStepComplete = (event: any) => {
      handleStepCompleted(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'step_completed',
        stepId: event.data.stepId,
        completedAt: new Date(event.data.timestamp),
        logs: event.data.logs,
      });
    };

    // Step failed
    const handleStepFail = (event: any) => {
      handleStepFailed(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'step_failed',
        stepId: event.data.stepId,
        completedAt: new Date(event.data.timestamp),
        errorMessage: event.data.error,
      });
      toast.error(`Step failed: ${event.data.stepName || 'Unknown step'}`);
    };

    // Phase completed
    const handlePhaseComplete = (event: any) => {
      handlePhaseCompleted(event.data);
      // Phase completion may need to trigger other updates, but for now we can skip
      // since the domain model rebuilds the timeline from all events
    };

    // Workflow completed
    const handleComplete = (event: any) => {
      handleWorkflowCompleted(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'workflow_status_updated',
        status: 'completed',
        completedAt: new Date(event.data.timestamp),
      });
      // Invalidate list to update workflow status
      queryClient.invalidateQueries({
        queryKey: ['workflow-executions', projectId],
      });
      toast.success('Workflow completed successfully');
    };

    // Workflow failed
    const handleFail = (event: any) => {
      handleWorkflowFailed(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'workflow_status_updated',
        status: 'failed',
        completedAt: new Date(event.data.timestamp),
        errorMessage: event.data.error,
      });
      // Invalidate list to update workflow status
      queryClient.invalidateQueries({
        queryKey: ['workflow-executions', projectId],
      });
      toast.error(`Workflow failed: ${event.data.error || 'Unknown error'}`);
    };

    // Workflow paused
    const handlePause = (event: any) => {
      handleWorkflowPaused(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'workflow_status_updated',
        status: 'paused',
      });
    };

    // Workflow resumed
    const handleResume = (event: any) => {
      handleWorkflowResumed(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'workflow_status_updated',
        status: 'running',
      });
    };

    // Workflow cancelled
    const handleCancel = (event: any) => {
      handleWorkflowCancelled(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'workflow_status_updated',
        status: 'cancelled',
        completedAt: new Date(event.data.timestamp),
      });
      // Invalidate list to update workflow status
      queryClient.invalidateQueries({
        queryKey: ['workflow-executions', projectId],
      });
      toast.info('Workflow cancelled');
    };

    // Annotation created
    const handleAnnotation = (event: any) => {
      handleCommentCreated(event.data);
      applyIncrementalUpdate(event.data.executionId, {
        type: 'annotation_added',
        annotationId: event.data.commentId,
        text: '', // Will be populated by event data
        userId: null,
        createdAt: new Date(event.data.timestamp),
      });
    };

    // Register all event listeners
    eventBus.on(channel, WorkflowEventTypes.CREATED, handleCreated);
    eventBus.on(channel, WorkflowEventTypes.STARTED, handleStarted);
    eventBus.on(channel, WorkflowEventTypes.STEP_STARTED, handleStepStart);
    eventBus.on(channel, WorkflowEventTypes.STEP_COMPLETED, handleStepComplete);
    eventBus.on(channel, WorkflowEventTypes.STEP_FAILED, handleStepFail);
    eventBus.on(channel, WorkflowEventTypes.PHASE_COMPLETED, handlePhaseComplete);
    eventBus.on(channel, WorkflowEventTypes.COMPLETED, handleComplete);
    eventBus.on(channel, WorkflowEventTypes.FAILED, handleFail);
    eventBus.on(channel, WorkflowEventTypes.PAUSED, handlePause);
    eventBus.on(channel, WorkflowEventTypes.RESUMED, handleResume);
    eventBus.on(channel, WorkflowEventTypes.CANCELLED, handleCancel);
    eventBus.on(channel, WorkflowEventTypes.ANNOTATION_CREATED, handleAnnotation);

    // Cleanup
    return () => {
      eventBus.off(channel, WorkflowEventTypes.CREATED, handleCreated);
      eventBus.off(channel, WorkflowEventTypes.STARTED, handleStarted);
      eventBus.off(channel, WorkflowEventTypes.STEP_STARTED, handleStepStart);
      eventBus.off(channel, WorkflowEventTypes.STEP_COMPLETED, handleStepComplete);
      eventBus.off(channel, WorkflowEventTypes.STEP_FAILED, handleStepFail);
      eventBus.off(channel, WorkflowEventTypes.PHASE_COMPLETED, handlePhaseComplete);
      eventBus.off(channel, WorkflowEventTypes.COMPLETED, handleComplete);
      eventBus.off(channel, WorkflowEventTypes.FAILED, handleFail);
      eventBus.off(channel, WorkflowEventTypes.PAUSED, handlePause);
      eventBus.off(channel, WorkflowEventTypes.RESUMED, handleResume);
      eventBus.off(channel, WorkflowEventTypes.CANCELLED, handleCancel);
      eventBus.off(channel, WorkflowEventTypes.ANNOTATION_CREATED, handleAnnotation);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isConnected]);
}
