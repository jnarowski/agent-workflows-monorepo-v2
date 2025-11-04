import { create } from 'zustand';
import type {
  WorkflowExecution,
  WorkflowFilter,
  WorkflowEvent,
} from '../types';
import {
  updateExecutionInMap,
  applyWorkflowStarted,
  applyWorkflowCompleted,
  applyWorkflowFailed,
  applyWorkflowPaused,
  applyWorkflowResumed,
  applyWorkflowCancelled,
  applyStepStarted,
  applyStepCompleted,
  applyStepFailed,
  applyPhaseCompleted,
  applyEventCreated,
} from '../utils/lib/workflowStateUpdates';

interface WorkflowStore {
  // State
  executions: Map<string, WorkflowExecution>;
  activeExecutionId: string | null;
  filter: WorkflowFilter;
  isConnected: boolean;

  // Basic actions
  setExecutions: (executions: WorkflowExecution[]) => void;
  addExecution: (execution: WorkflowExecution) => void;
  updateExecution: (
    id: string,
    updates: Partial<WorkflowExecution>
  ) => void;
  removeExecution: (id: string) => void;
  setActiveExecution: (id: string | null) => void;
  setFilter: (filter: Partial<WorkflowFilter>) => void;
  setConnected: (connected: boolean) => void;
  clearExecutions: () => void;

  // WebSocket event handlers
  handleWorkflowCreated: (event: { execution: WorkflowExecution }) => void;
  handleWorkflowStarted: (event: { executionId: string }) => void;
  handleStepStarted: (event: {
    executionId: string;
    stepId: string;
    stepName: string;
    phaseName: string;
  }) => void;
  handleStepCompleted: (event: {
    executionId: string;
    stepId: string;
    logs: string;
  }) => void;
  handleStepFailed: (event: {
    executionId: string;
    stepId: string;
    error: string;
  }) => void;
  handlePhaseCompleted: (event: {
    executionId: string;
    phaseName: string;
    nextPhase: string | null;
  }) => void;
  handleWorkflowCompleted: (event: { executionId: string }) => void;
  handleWorkflowFailed: (event: {
    executionId: string;
    error: string;
  }) => void;
  handleWorkflowPaused: (event: { executionId: string }) => void;
  handleWorkflowResumed: (event: { executionId: string }) => void;
  handleWorkflowCancelled: (event: { executionId: string }) => void;
  handleEventCreated: (event: {
    executionId: string;
    event: WorkflowEvent;
  }) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  // Initial state
  executions: new Map(),
  activeExecutionId: null,
  filter: {},
  isConnected: false,

  // Basic actions
  setExecutions: (executions) =>
    set(() => ({
      executions: new Map(executions.map((e) => [e.id, e])),
    })),

  addExecution: (execution) =>
    set((state) => {
      const newExecutions = new Map(state.executions);
      newExecutions.set(execution.id, execution);
      return { executions: newExecutions };
    }),

  updateExecution: (id, updates) =>
    set((state) => {
      const execution = state.executions.get(id);
      if (!execution) return state;

      const newExecutions = new Map(state.executions);
      newExecutions.set(id, {
        ...execution,
        ...updates,
        updated_at: new Date(),
      });
      return { executions: newExecutions };
    }),

  removeExecution: (id) =>
    set((state) => {
      const newExecutions = new Map(state.executions);
      newExecutions.delete(id);
      return { executions: newExecutions };
    }),

  setActiveExecution: (id) =>
    set(() => ({
      activeExecutionId: id,
    })),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  setConnected: (connected) =>
    set(() => ({
      isConnected: connected,
    })),

  clearExecutions: () =>
    set(() => ({
      executions: new Map(),
      activeExecutionId: null,
    })),

  // WebSocket event handlers
  handleWorkflowCreated: (event) =>
    set((state) => {
      const newExecutions = new Map(state.executions);
      newExecutions.set(event.execution.id, event.execution);
      return { executions: newExecutions };
    }),

  handleWorkflowStarted: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        applyWorkflowStarted
      ),
    })),

  handleStepStarted: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        (exec) => applyStepStarted(exec, event)
      ),
    })),

  handleStepCompleted: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        (exec) => applyStepCompleted(exec, event)
      ),
    })),

  handleStepFailed: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        (exec) => applyStepFailed(exec, event)
      ),
    })),

  handlePhaseCompleted: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        (exec) => applyPhaseCompleted(exec, event.nextPhase)
      ),
    })),

  handleWorkflowCompleted: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        applyWorkflowCompleted
      ),
    })),

  handleWorkflowFailed: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        (exec) => applyWorkflowFailed(exec, event.error)
      ),
    })),

  handleWorkflowPaused: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        applyWorkflowPaused
      ),
    })),

  handleWorkflowResumed: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        applyWorkflowResumed
      ),
    })),

  handleWorkflowCancelled: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        applyWorkflowCancelled
      ),
    })),

  handleEventCreated: (event) =>
    set((state) => ({
      executions: updateExecutionInMap(
        state.executions,
        event.executionId,
        (exec) => applyEventCreated(exec, event.event)
      ),
    })),
}));
