/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/client/hooks/useWebSocket';
import { Channels } from '@/shared/websocket';
import { WorkflowEventTypes } from '@/shared/websocket/types';
import { useWorkflowStore } from '../stores/workflowStore';
import { toast } from 'sonner';

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

    // Workflow created
    const handleCreated = (event: any) => {
      handleWorkflowCreated(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-executions', projectId],
      });
    };

    // Workflow started
    const handleStarted = (event: any) => {
      handleWorkflowStarted(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
    };

    // Step started
    const handleStepStart = (event: any) => {
      handleStepStarted(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
    };

    // Step completed
    const handleStepComplete = (event: any) => {
      handleStepCompleted(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
    };

    // Step failed
    const handleStepFail = (event: any) => {
      handleStepFailed(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
      toast.error(`Step failed: ${event.data.stepName || 'Unknown step'}`);
    };

    // Phase completed
    const handlePhaseComplete = (event: any) => {
      handlePhaseCompleted(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
    };

    // Workflow completed
    const handleComplete = (event: any) => {
      handleWorkflowCompleted(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workflow-executions', projectId],
      });
      toast.success('Workflow completed successfully');
    };

    // Workflow failed
    const handleFail = (event: any) => {
      handleWorkflowFailed(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workflow-executions', projectId],
      });
      toast.error(`Workflow failed: ${event.data.error || 'Unknown error'}`);
    };

    // Workflow paused
    const handlePause = (event: any) => {
      handleWorkflowPaused(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
    };

    // Workflow resumed
    const handleResume = (event: any) => {
      handleWorkflowResumed(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
    };

    // Workflow cancelled
    const handleCancel = (event: any) => {
      handleWorkflowCancelled(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workflow-executions', projectId],
      });
      toast.info('Workflow cancelled');
    };

    // Comment created
    const handleComment = (event: any) => {
      handleCommentCreated(event.data);
      queryClient.invalidateQueries({
        queryKey: ['workflow-execution', event.data.executionId],
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
    eventBus.on(channel, WorkflowEventTypes.COMMENT_CREATED, handleComment);

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
      eventBus.off(channel, WorkflowEventTypes.COMMENT_CREATED, handleComment);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isConnected]);
}
