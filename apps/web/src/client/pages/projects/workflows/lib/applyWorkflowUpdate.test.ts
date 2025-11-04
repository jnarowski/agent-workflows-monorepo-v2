import { describe, it, expect } from 'vitest';
import { applyWorkflowUpdate } from './applyWorkflowUpdate';
import type {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowEvent,
  WorkflowArtifact,
} from '../types';
import type {
  WorkflowStatusUpdate,
  StepStartedUpdate,
  StepUpdatedUpdate,
  StepCompletedUpdate,
  StepFailedUpdate,
  EventAddedUpdate,
  AnnotationAddedUpdate,
  ArtifactUploadedUpdate,
} from './applyWorkflowUpdate';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockExecution(overrides?: Partial<WorkflowExecution>): WorkflowExecution {
  return {
    id: 'exec-1',
    workflow_definition_id: 'def-1',
    project_id: 'proj-1',
    name: 'Test Workflow',
    status: 'running',
    args: null,
    current_step: null,
    current_phase: null,
    error_message: null,
    started_at: new Date('2025-01-01T00:00:00Z'),
    completed_at: null,
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
    created_by: 'user-1',
    steps: [],
    events: [],
    artifacts: [],
    ...overrides,
  };
}

function createMockStep(overrides?: Partial<WorkflowExecutionStep>): WorkflowExecutionStep {
  return {
    id: 'step-1',
    workflow_execution_id: 'exec-1',
    step_name: 'Test Step',
    phase_name: 'Test Phase',
    status: 'pending',
    logs: null,
    error_message: null,
    agent_session_id: null,
    started_at: null,
    completed_at: null,
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createMockEvent(overrides?: Partial<WorkflowEvent>): WorkflowEvent {
  return {
    id: 'event-1',
    workflow_execution_id: 'exec-1',
    workflow_execution_step_id: null,
    event_type: 'workflow_started',
    event_data: {
      title: 'Workflow Started',
      body: 'Workflow execution started',
    },
    created_by_user_id: null,
    created_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createMockArtifact(overrides?: Partial<WorkflowArtifact>): WorkflowArtifact {
  return {
    id: 'artifact-1',
    workflow_execution_step_id: 'step-1',
    workflow_event_id: null,
    name: 'test.txt',
    file_path: '/path/to/test.txt',
    file_type: 'text',
    mime_type: 'text/plain',
    size_bytes: 1024,
    created_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ============================================================================
// Tests: Workflow Status Updates
// ============================================================================

describe('applyWorkflowUpdate - Workflow Status', () => {
  it('should update workflow status to completed', () => {
    const execution = createMockExecution({ status: 'running' });
    const update: WorkflowStatusUpdate = {
      type: 'workflow_status_updated',
      status: 'completed',
      completedAt: new Date('2025-01-01T01:00:00Z'),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.status).toBe('completed');
    expect(result.completed_at).toEqual(new Date('2025-01-01T01:00:00Z'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update workflow status to failed with error message', () => {
    const execution = createMockExecution({ status: 'running' });
    const update: WorkflowStatusUpdate = {
      type: 'workflow_status_updated',
      status: 'failed',
      completedAt: new Date('2025-01-01T01:00:00Z'),
      errorMessage: 'Step failed unexpectedly',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.status).toBe('failed');
    expect(result.error_message).toBe('Step failed unexpectedly');
    expect(result.completed_at).toEqual(new Date('2025-01-01T01:00:00Z'));
  });

  it('should preserve existing data when updating status', () => {
    const execution = createMockExecution({
      status: 'running',
      steps: [createMockStep()],
      events: [createMockEvent()],
    });
    const update: WorkflowStatusUpdate = {
      type: 'workflow_status_updated',
      status: 'paused',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.status).toBe('paused');
    expect(result.steps).toEqual(execution.steps);
    expect(result.events).toEqual(execution.events);
  });

  it('should update workflow status without completedAt', () => {
    const execution = createMockExecution({ status: 'running' });
    const update: WorkflowStatusUpdate = {
      type: 'workflow_status_updated',
      status: 'paused',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.status).toBe('paused');
    expect(result.completed_at).toBeNull();
  });
});

// ============================================================================
// Tests: Step Started Updates
// ============================================================================

describe('applyWorkflowUpdate - Step Started', () => {
  it('should update step status to running and set started_at', () => {
    const step = createMockStep({ id: 'step-1', status: 'pending' });
    const execution = createMockExecution({ steps: [step] });
    const startedAt = new Date('2025-01-01T00:05:00Z');

    const update: StepStartedUpdate = {
      type: 'step_started',
      stepId: 'step-1',
      startedAt,
      stepName: 'Test Step',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps).toHaveLength(1);
    expect(result.steps![0].status).toBe('running');
    expect(result.steps![0].started_at).toEqual(startedAt);
  });

  it('should create step_started event', () => {
    const step = createMockStep({ id: 'step-1' });
    const execution = createMockExecution({ steps: [step], events: [] });
    const startedAt = new Date('2025-01-01T00:05:00Z');

    const update: StepStartedUpdate = {
      type: 'step_started',
      stepId: 'step-1',
      startedAt,
      stepName: 'Build Phase',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.events).toHaveLength(1);
    expect(result.events![0].event_type).toBe('step_started');
    expect(result.events![0].workflow_execution_step_id).toBe('step-1');
    expect(result.events![0].event_data.step_name).toBe('Build Phase');
  });

  it('should update current_step field', () => {
    const step = createMockStep({ id: 'step-1' });
    const execution = createMockExecution({
      steps: [step],
      current_step: null,
    });

    const update: StepStartedUpdate = {
      type: 'step_started',
      stepId: 'step-1',
      startedAt: new Date(),
      stepName: 'Deploy',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.current_step).toBe('Deploy');
  });

  it('should only update matching step', () => {
    const step1 = createMockStep({ id: 'step-1', status: 'pending' });
    const step2 = createMockStep({ id: 'step-2', status: 'pending' });
    const execution = createMockExecution({ steps: [step1, step2] });

    const update: StepStartedUpdate = {
      type: 'step_started',
      stepId: 'step-2',
      startedAt: new Date(),
      stepName: 'Step 2',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].status).toBe('pending'); // step-1 unchanged
    expect(result.steps![1].status).toBe('running'); // step-2 updated
  });

  it('should append event to existing events', () => {
    const existingEvent = createMockEvent();
    const step = createMockStep({ id: 'step-1' });
    const execution = createMockExecution({
      steps: [step],
      events: [existingEvent],
    });

    const update: StepStartedUpdate = {
      type: 'step_started',
      stepId: 'step-1',
      startedAt: new Date(),
      stepName: 'Test',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.events).toHaveLength(2);
    expect(result.events![0]).toEqual(existingEvent);
    expect(result.events![1].event_type).toBe('step_started');
  });
});

// ============================================================================
// Tests: Step Updated
// ============================================================================

describe('applyWorkflowUpdate - Step Updated', () => {
  it('should apply partial updates to step', () => {
    const step = createMockStep({ id: 'step-1', logs: null });
    const execution = createMockExecution({ steps: [step] });

    const update: StepUpdatedUpdate = {
      type: 'step_updated',
      stepId: 'step-1',
      updates: {
        logs: 'Building project...\nInstalling dependencies...',
      },
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].logs).toBe('Building project...\nInstalling dependencies...');
  });

  it('should merge multiple fields in update', () => {
    const step = createMockStep({
      id: 'step-1',
      logs: null,
      agent_session_id: null,
    });
    const execution = createMockExecution({ steps: [step] });

    const update: StepUpdatedUpdate = {
      type: 'step_updated',
      stepId: 'step-1',
      updates: {
        logs: 'Progress...',
        agent_session_id: 'session-123',
      },
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].logs).toBe('Progress...');
    expect(result.steps![0].agent_session_id).toBe('session-123');
  });

  it('should preserve other step fields', () => {
    const step = createMockStep({
      id: 'step-1',
      status: 'running',
      step_name: 'Build',
    });
    const execution = createMockExecution({ steps: [step] });

    const update: StepUpdatedUpdate = {
      type: 'step_updated',
      stepId: 'step-1',
      updates: {
        logs: 'New logs',
      },
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].status).toBe('running');
    expect(result.steps![0].step_name).toBe('Build');
    expect(result.steps![0].logs).toBe('New logs');
  });

  it('should only update specified step', () => {
    const step1 = createMockStep({ id: 'step-1', logs: 'old logs' });
    const step2 = createMockStep({ id: 'step-2', logs: null });
    const execution = createMockExecution({ steps: [step1, step2] });

    const update: StepUpdatedUpdate = {
      type: 'step_updated',
      stepId: 'step-2',
      updates: { logs: 'new logs' },
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].logs).toBe('old logs'); // unchanged
    expect(result.steps![1].logs).toBe('new logs'); // updated
  });
});

// ============================================================================
// Tests: Step Completed
// ============================================================================

describe('applyWorkflowUpdate - Step Completed', () => {
  it('should mark step as completed with timestamp', () => {
    const step = createMockStep({ id: 'step-1', status: 'running' });
    const execution = createMockExecution({ steps: [step] });
    const completedAt = new Date('2025-01-01T00:10:00Z');

    const update: StepCompletedUpdate = {
      type: 'step_completed',
      stepId: 'step-1',
      completedAt,
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].status).toBe('completed');
    expect(result.steps![0].completed_at).toEqual(completedAt);
  });

  it('should update logs when provided', () => {
    const step = createMockStep({ id: 'step-1', logs: 'initial logs' });
    const execution = createMockExecution({ steps: [step] });

    const update: StepCompletedUpdate = {
      type: 'step_completed',
      stepId: 'step-1',
      completedAt: new Date(),
      logs: 'final logs with completion',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].logs).toBe('final logs with completion');
  });

  it('should preserve existing logs when not provided', () => {
    const step = createMockStep({ id: 'step-1', logs: 'existing logs' });
    const execution = createMockExecution({ steps: [step] });

    const update: StepCompletedUpdate = {
      type: 'step_completed',
      stepId: 'step-1',
      completedAt: new Date(),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].logs).toBe('existing logs');
  });
});

// ============================================================================
// Tests: Step Failed
// ============================================================================

describe('applyWorkflowUpdate - Step Failed', () => {
  it('should mark step as failed with error message', () => {
    const step = createMockStep({ id: 'step-1', status: 'running' });
    const execution = createMockExecution({ steps: [step] });
    const completedAt = new Date('2025-01-01T00:10:00Z');

    const update: StepFailedUpdate = {
      type: 'step_failed',
      stepId: 'step-1',
      completedAt,
      errorMessage: 'Build failed: compilation error',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].status).toBe('failed');
    expect(result.steps![0].error_message).toBe('Build failed: compilation error');
    expect(result.steps![0].completed_at).toEqual(completedAt);
  });

  it('should update logs with error details', () => {
    const step = createMockStep({ id: 'step-1' });
    const execution = createMockExecution({ steps: [step] });

    const update: StepFailedUpdate = {
      type: 'step_failed',
      stepId: 'step-1',
      completedAt: new Date(),
      errorMessage: 'Connection timeout',
      logs: 'Error stack trace...',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].logs).toBe('Error stack trace...');
  });

  it('should preserve existing logs when not provided', () => {
    const step = createMockStep({ id: 'step-1', logs: 'previous logs' });
    const execution = createMockExecution({ steps: [step] });

    const update: StepFailedUpdate = {
      type: 'step_failed',
      stepId: 'step-1',
      completedAt: new Date(),
      errorMessage: 'Failed',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps![0].logs).toBe('previous logs');
  });
});

// ============================================================================
// Tests: Event Added
// ============================================================================

describe('applyWorkflowUpdate - Event Added', () => {
  it('should add new event to events array', () => {
    const execution = createMockExecution({ events: [] });
    const newEvent = createMockEvent({
      id: 'event-new',
      event_type: 'phase_started',
    });

    const update: EventAddedUpdate = {
      type: 'event_added',
      event: newEvent,
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.events).toHaveLength(1);
    expect(result.events![0]).toEqual(newEvent);
  });

  it('should append to existing events', () => {
    const existingEvent = createMockEvent({ id: 'event-1' });
    const execution = createMockExecution({ events: [existingEvent] });
    const newEvent = createMockEvent({ id: 'event-2' });

    const update: EventAddedUpdate = {
      type: 'event_added',
      event: newEvent,
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.events).toHaveLength(2);
    expect(result.events![0]).toEqual(existingEvent);
    expect(result.events![1]).toEqual(newEvent);
  });

  it('should not mutate original events array', () => {
    const execution = createMockExecution({ events: [] });
    const newEvent = createMockEvent();

    const update: EventAddedUpdate = {
      type: 'event_added',
      event: newEvent,
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(execution.events).toHaveLength(0); // original unchanged
    expect(result.events).toHaveLength(1); // new array created
  });
});

// ============================================================================
// Tests: Annotation Added
// ============================================================================

describe('applyWorkflowUpdate - Annotation Added', () => {
  it('should create annotation event with metadata', () => {
    const execution = createMockExecution({ events: [] });
    const createdAt = new Date('2025-01-01T00:15:00Z');

    const update: AnnotationAddedUpdate = {
      type: 'annotation_added',
      annotationId: 'annotation-1',
      text: 'This is a test annotation',
      userId: 'user-1',
      createdAt,
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.events).toHaveLength(1);
    expect(result.events![0].id).toBe('annotation-1');
    expect(result.events![0].event_type).toBe('annotation_added');
    expect(result.events![0].event_data.body).toBe('This is a test annotation');
    expect(result.events![0].created_by_user_id).toBe('user-1');
    expect(result.events![0].created_at).toEqual(createdAt);
  });

  it('should attach annotation to step when stepId provided', () => {
    const execution = createMockExecution({ events: [] });

    const update: AnnotationAddedUpdate = {
      type: 'annotation_added',
      annotationId: 'annotation-1',
      text: 'Step-specific note',
      stepId: 'step-1',
      userId: 'user-1',
      createdAt: new Date(),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.events![0].workflow_execution_step_id).toBe('step-1');
  });

  it('should create standalone annotation when no stepId', () => {
    const execution = createMockExecution({ events: [] });

    const update: AnnotationAddedUpdate = {
      type: 'annotation_added',
      annotationId: 'annotation-1',
      text: 'General workflow note',
      userId: 'user-1',
      createdAt: new Date(),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.events![0].workflow_execution_step_id).toBeNull();
  });

  it('should support system annotations (null userId)', () => {
    const execution = createMockExecution({ events: [] });

    const update: AnnotationAddedUpdate = {
      type: 'annotation_added',
      annotationId: 'annotation-1',
      text: 'System generated note',
      userId: null,
      createdAt: new Date(),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.events![0].created_by_user_id).toBeNull();
  });
});

// ============================================================================
// Tests: Artifact Uploaded
// ============================================================================

describe('applyWorkflowUpdate - Artifact Uploaded', () => {
  it('should add new artifact to artifacts array', () => {
    const execution = createMockExecution({ artifacts: [] });
    const artifact = createMockArtifact();

    const update: ArtifactUploadedUpdate = {
      type: 'artifact_uploaded',
      artifact,
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts![0]).toEqual(artifact);
  });

  it('should append to existing artifacts', () => {
    const existingArtifact = createMockArtifact({ id: 'artifact-1' });
    const execution = createMockExecution({ artifacts: [existingArtifact] });
    const newArtifact = createMockArtifact({ id: 'artifact-2' });

    const update: ArtifactUploadedUpdate = {
      type: 'artifact_uploaded',
      artifact: newArtifact,
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.artifacts).toHaveLength(2);
    expect(result.artifacts![0]).toEqual(existingArtifact);
    expect(result.artifacts![1]).toEqual(newArtifact);
  });

  it('should not mutate original artifacts array', () => {
    const execution = createMockExecution({ artifacts: [] });
    const artifact = createMockArtifact();

    const update: ArtifactUploadedUpdate = {
      type: 'artifact_uploaded',
      artifact,
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(execution.artifacts).toHaveLength(0); // original unchanged
    expect(result.artifacts).toHaveLength(1); // new array created
  });
});

// ============================================================================
// Tests: Immutability
// ============================================================================

describe('applyWorkflowUpdate - Immutability', () => {
  it('should not mutate original execution object', () => {
    const execution = createMockExecution({ status: 'running' });
    const originalStatus = execution.status;

    const update: WorkflowStatusUpdate = {
      type: 'workflow_status_updated',
      status: 'completed',
    };

    applyWorkflowUpdate(execution, update);

    expect(execution.status).toBe(originalStatus); // unchanged
  });

  it('should not mutate steps array', () => {
    const step = createMockStep({ id: 'step-1', status: 'pending' });
    const execution = createMockExecution({ steps: [step] });
    const originalSteps = execution.steps;

    const update: StepStartedUpdate = {
      type: 'step_started',
      stepId: 'step-1',
      startedAt: new Date(),
      stepName: 'Test',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(execution.steps).toBe(originalSteps); // same reference
    expect(result.steps).not.toBe(originalSteps); // new array created
  });

  it('should not mutate events array', () => {
    const execution = createMockExecution({ events: [] });
    const originalEvents = execution.events;

    const update: EventAddedUpdate = {
      type: 'event_added',
      event: createMockEvent(),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(execution.events).toBe(originalEvents); // same reference
    expect(result.events).not.toBe(originalEvents); // new array created
  });

  it('should not mutate artifacts array', () => {
    const execution = createMockExecution({ artifacts: [] });
    const originalArtifacts = execution.artifacts;

    const update: ArtifactUploadedUpdate = {
      type: 'artifact_uploaded',
      artifact: createMockArtifact(),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(execution.artifacts).toBe(originalArtifacts);
    expect(result.artifacts).not.toBe(originalArtifacts);
  });
});

// ============================================================================
// Tests: Edge Cases
// ============================================================================

describe('applyWorkflowUpdate - Edge Cases', () => {
  it('should handle empty steps array', () => {
    const execution = createMockExecution({ steps: [] });

    const update: StepStartedUpdate = {
      type: 'step_started',
      stepId: 'nonexistent-step',
      startedAt: new Date(),
      stepName: 'Test',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps).toHaveLength(0);
    expect(result.events).toHaveLength(1); // event still created
  });

  it('should handle undefined steps array', () => {
    const execution = createMockExecution({ steps: undefined });

    const update: StepCompletedUpdate = {
      type: 'step_completed',
      stepId: 'step-1',
      completedAt: new Date(),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.steps).toEqual([]);
  });

  it('should handle undefined events array', () => {
    const execution = createMockExecution({ events: undefined });

    const update: EventAddedUpdate = {
      type: 'event_added',
      event: createMockEvent(),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.events).toHaveLength(1);
  });

  it('should handle undefined artifacts array', () => {
    const execution = createMockExecution({ artifacts: undefined });

    const update: ArtifactUploadedUpdate = {
      type: 'artifact_uploaded',
      artifact: createMockArtifact(),
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.artifacts).toHaveLength(1);
  });

  it('should update updated_at timestamp on all updates', () => {
    const execution = createMockExecution({
      updated_at: new Date('2025-01-01T00:00:00Z'),
    });
    const originalUpdatedAt = execution.updated_at;

    // Wait a tiny bit to ensure timestamp is different
    const update: WorkflowStatusUpdate = {
      type: 'workflow_status_updated',
      status: 'paused',
    };

    const result = applyWorkflowUpdate(execution, update);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
  });
});

// ============================================================================
// Tests: Multiple Updates
// ============================================================================

describe('applyWorkflowUpdate - Sequential Updates', () => {
  it('should handle sequential step updates', () => {
    let execution = createMockExecution({
      steps: [createMockStep({ id: 'step-1', status: 'pending' })],
    });

    // Start step
    execution = applyWorkflowUpdate(execution, {
      type: 'step_started',
      stepId: 'step-1',
      startedAt: new Date(),
      stepName: 'Build',
    });

    expect(execution.steps![0].status).toBe('running');

    // Update step logs
    execution = applyWorkflowUpdate(execution, {
      type: 'step_updated',
      stepId: 'step-1',
      updates: { logs: 'Building...' },
    });

    expect(execution.steps![0].logs).toBe('Building...');

    // Complete step
    execution = applyWorkflowUpdate(execution, {
      type: 'step_completed',
      stepId: 'step-1',
      completedAt: new Date(),
    });

    expect(execution.steps![0].status).toBe('completed');
  });

  it('should accumulate events from multiple updates', () => {
    let execution = createMockExecution({ events: [] });

    execution = applyWorkflowUpdate(execution, {
      type: 'event_added',
      event: createMockEvent({ id: 'event-1' }),
    });

    execution = applyWorkflowUpdate(execution, {
      type: 'event_added',
      event: createMockEvent({ id: 'event-2' }),
    });

    execution = applyWorkflowUpdate(execution, {
      type: 'event_added',
      event: createMockEvent({ id: 'event-3' }),
    });

    expect(execution.events).toHaveLength(3);
  });
});
