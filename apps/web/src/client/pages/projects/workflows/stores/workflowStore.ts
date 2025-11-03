import { create } from 'zustand';
import type {
  WorkflowExecution,
  WorkflowFilter,
  WorkflowComment,
} from '../types';
import { WorkflowStatus, StepStatus } from '../types';

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
  handleCommentCreated: (event: {
    executionId: string;
    comment: WorkflowComment;
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
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution) return state;

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, {
        ...execution,
        status: WorkflowStatus.RUNNING,
        started_at: new Date(),
        updated_at: new Date(),
      });
      return { executions: newExecutions };
    }),

  handleStepStarted: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution) return state;

      // Update current step and phase
      const newExecution = {
        ...execution,
        current_step: event.stepName,
        current_phase: event.phaseName,
        updated_at: new Date(),
      };

      // Update step status if steps are loaded
      if (execution.steps) {
        newExecution.steps = execution.steps.map((step) =>
          step.id === event.stepId
            ? {
                ...step,
                status: StepStatus.RUNNING,
                started_at: new Date(),
                updated_at: new Date(),
              }
            : step
        );
      }

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, newExecution);
      return { executions: newExecutions };
    }),

  handleStepCompleted: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution || !execution.steps) return state;

      const newExecution = {
        ...execution,
        steps: execution.steps.map((step) =>
          step.id === event.stepId
            ? {
                ...step,
                status: StepStatus.COMPLETED,
                logs: event.logs,
                completed_at: new Date(),
                updated_at: new Date(),
              }
            : step
        ),
        updated_at: new Date(),
      };

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, newExecution);
      return { executions: newExecutions };
    }),

  handleStepFailed: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution || !execution.steps) return state;

      const newExecution = {
        ...execution,
        steps: execution.steps.map((step) =>
          step.id === event.stepId
            ? {
                ...step,
                status: StepStatus.FAILED,
                error_message: event.error,
                completed_at: new Date(),
                updated_at: new Date(),
              }
            : step
        ),
        updated_at: new Date(),
      };

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, newExecution);
      return { executions: newExecutions };
    }),

  handlePhaseCompleted: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution) return state;

      const newExecution = {
        ...execution,
        current_phase: event.nextPhase,
        updated_at: new Date(),
      };

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, newExecution);
      return { executions: newExecutions };
    }),

  handleWorkflowCompleted: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution) return state;

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, {
        ...execution,
        status: WorkflowStatus.COMPLETED,
        completed_at: new Date(),
        updated_at: new Date(),
      });
      return { executions: newExecutions };
    }),

  handleWorkflowFailed: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution) return state;

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, {
        ...execution,
        status: WorkflowStatus.FAILED,
        error_message: event.error,
        completed_at: new Date(),
        updated_at: new Date(),
      });
      return { executions: newExecutions };
    }),

  handleWorkflowPaused: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution) return state;

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, {
        ...execution,
        status: WorkflowStatus.PAUSED,
        updated_at: new Date(),
      });
      return { executions: newExecutions };
    }),

  handleWorkflowResumed: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution) return state;

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, {
        ...execution,
        status: WorkflowStatus.RUNNING,
        updated_at: new Date(),
      });
      return { executions: newExecutions };
    }),

  handleWorkflowCancelled: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution) return state;

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, {
        ...execution,
        status: WorkflowStatus.CANCELLED,
        completed_at: new Date(),
        updated_at: new Date(),
      });
      return { executions: newExecutions };
    }),

  handleCommentCreated: (event) =>
    set((state) => {
      const execution = state.executions.get(event.executionId);
      if (!execution) return state;

      const newExecution = {
        ...execution,
        comments: execution.comments
          ? [...execution.comments, event.comment]
          : [event.comment],
        updated_at: new Date(),
      };

      const newExecutions = new Map(state.executions);
      newExecutions.set(event.executionId, newExecution);
      return { executions: newExecutions };
    }),
}));
