import { describe, it, expect } from 'vitest';
import { buildTimelineModel, getExecutionStatusLabel } from './buildTimelineModel';
import type {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowEvent,
  WorkflowArtifact,
} from '../types';
import type {
  TimelineModel,
  StepTimelineItem,
  EventTimelineItem,
  AnnotationTimelineItem,
} from './timelineModel';

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
    started_at: new Date('2025-01-01T00:01:00Z'),
    completed_at: null,
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:01:00Z'),
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
    created_at: new Date('2025-01-01T00:05:00Z'),
    ...overrides,
  };
}

// ============================================================================
// Tests: Basic Timeline Building
// ============================================================================

describe('buildTimelineModel - Basic Functionality', () => {
  it('should build timeline with empty data', () => {
    const execution = createMockExecution();
    const result = buildTimelineModel(execution, [], [], []);

    expect(result.execution).toEqual(execution);
    expect(result.items).toEqual([]);
    expect(result.summary.totalSteps).toBe(0);
    expect(result.liveState.isLive).toBe(true); // status is 'running'
  });

  it('should build timeline with single step', () => {
    const execution = createMockExecution();
    const step = createMockStep({ id: 'step-1', status: 'running' });

    const result = buildTimelineModel(execution, [step], [], []);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].itemType).toBe('step');
    expect((result.items[0] as StepTimelineItem).step.id).toBe('step-1');
  });

  it('should build timeline with single event', () => {
    const execution = createMockExecution();
    const event = createMockEvent({ event_type: 'workflow_started' });

    const result = buildTimelineModel(execution, [], [event], []);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].itemType).toBe('event');
    expect((result.items[0] as EventTimelineItem).event.event_type).toBe('workflow_started');
  });

  it('should sort items chronologically', () => {
    const execution = createMockExecution();
    const step1 = createMockStep({
      id: 'step-1',
      started_at: new Date('2025-01-01T00:03:00Z'),
    });
    const event1 = createMockEvent({
      id: 'event-1',
      created_at: new Date('2025-01-01T00:01:00Z'),
    });
    const event2 = createMockEvent({
      id: 'event-2',
      created_at: new Date('2025-01-01T00:05:00Z'),
    });

    const result = buildTimelineModel(execution, [step1], [event1, event2], []);

    expect(result.items).toHaveLength(3);
    expect(result.items[0].timestamp).toEqual(new Date('2025-01-01T00:01:00Z'));
    expect(result.items[1].timestamp).toEqual(new Date('2025-01-01T00:03:00Z'));
    expect(result.items[2].timestamp).toEqual(new Date('2025-01-01T00:05:00Z'));
  });
});

// ============================================================================
// Tests: Step Items
// ============================================================================

describe('buildTimelineModel - Step Items', () => {
  it('should filter out pending steps without started_at', () => {
    const execution = createMockExecution();
    const pendingStep = createMockStep({ id: 'step-1', status: 'pending', started_at: null });
    const runningStep = createMockStep({
      id: 'step-2',
      status: 'running',
      started_at: new Date('2025-01-01T00:01:00Z'),
    });

    const result = buildTimelineModel(execution, [pendingStep, runningStep], [], []);

    expect(result.items).toHaveLength(1);
    expect((result.items[0] as StepTimelineItem).step.id).toBe('step-2');
  });

  it('should compute step duration for completed steps', () => {
    const execution = createMockExecution();
    const step = createMockStep({
      started_at: new Date('2025-01-01T00:00:00Z'),
      completed_at: new Date('2025-01-01T00:05:00Z'),
      status: 'completed',
    });

    const result = buildTimelineModel(execution, [step], [], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.metadata.duration).toBe(5 * 60 * 1000); // 5 minutes in ms
  });

  it('should set duration to null for running steps', () => {
    const execution = createMockExecution();
    const step = createMockStep({
      started_at: new Date('2025-01-01T00:00:00Z'),
      completed_at: null,
      status: 'running',
    });

    const result = buildTimelineModel(execution, [step], [], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.metadata.duration).toBeNull();
  });

  it('should compute display properties for failed step', () => {
    const execution = createMockExecution();
    const step = createMockStep({
      status: 'failed',
      error_message: 'Build failed',
    });

    const result = buildTimelineModel(execution, [step], [], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.display.status).toBe('failed');
    expect(stepItem.display.hasError).toBe(true);
    expect(stepItem.display.badgeVariant).toBe('destructive');
    expect(stepItem.debug.errorMessage).toBe('Build failed');
  });

  it('should mark running step as pulsing', () => {
    const execution = createMockExecution();
    const step = createMockStep({ status: 'running' });

    const result = buildTimelineModel(execution, [step], [], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.display.isPulsing).toBe(true);
  });

  it('should mark current step as highlighted', () => {
    const execution = createMockExecution({
      status: 'running',
      current_step: 'Build Phase',
    });
    const step = createMockStep({
      step_name: 'Build Phase',
      status: 'running',
    });

    const result = buildTimelineModel(execution, [step], [], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.display.isHighlighted).toBe(true);
    expect(stepItem.debug.isCurrent).toBe(true);
  });

  it('should detect steps with logs', () => {
    const execution = createMockExecution();
    const step = createMockStep({
      logs: 'Building project...\nInstalling dependencies...',
    });

    const result = buildTimelineModel(execution, [step], [], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.display.hasLogs).toBe(true);
  });
});

// ============================================================================
// Tests: Annotations
// ============================================================================

describe('buildTimelineModel - Annotations', () => {
  it('should attach annotations to steps', () => {
    const execution = createMockExecution();
    const step = createMockStep({ id: 'step-1' });
    const annotation = createMockEvent({
      id: 'annotation-1',
      event_type: 'annotation_added',
      workflow_execution_step_id: 'step-1',
      event_data: {
        title: 'Annotation',
        body: 'This is a note',
      },
      created_by_user_id: 'user-1',
      created_by_user: {
        id: 'user-1',
        username: 'testuser',
      },
    });

    const result = buildTimelineModel(execution, [step], [annotation], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.annotations).toHaveLength(1);
    expect(stepItem.annotations[0].text).toBe('This is a note');
    expect(stepItem.annotations[0].created_by_username).toBe('testuser');
    expect(stepItem.display.hasAnnotations).toBe(true);
  });

  it('should create standalone annotation items', () => {
    const execution = createMockExecution();
    const annotation = createMockEvent({
      id: 'annotation-1',
      event_type: 'annotation_added',
      workflow_execution_step_id: null, // Not attached to step
      event_data: {
        title: 'Annotation',
        body: 'Standalone note',
      },
    });

    const result = buildTimelineModel(execution, [], [annotation], []);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].itemType).toBe('annotation');
    const annotationItem = result.items[0] as AnnotationTimelineItem;
    expect(annotationItem.metadata.text).toBe('Standalone note');
  });

  it('should separate step annotations from standalone annotations', () => {
    const execution = createMockExecution();
    const step = createMockStep({ id: 'step-1' });
    const stepAnnotation = createMockEvent({
      id: 'annotation-1',
      event_type: 'annotation_added',
      workflow_execution_step_id: 'step-1',
      event_data: { title: 'Note', body: 'Step note' },
    });
    const standaloneAnnotation = createMockEvent({
      id: 'annotation-2',
      event_type: 'annotation_added',
      workflow_execution_step_id: null,
      event_data: { title: 'Note', body: 'Standalone note' },
    });

    const result = buildTimelineModel(execution, [step], [stepAnnotation, standaloneAnnotation], []);

    // Should have 2 items: step (with annotation) + standalone annotation
    expect(result.items).toHaveLength(2);

    const stepItem = result.items.find((i) => i.itemType === 'step') as StepTimelineItem;
    expect(stepItem.annotations).toHaveLength(1);

    const annotationItem = result.items.find((i) => i.itemType === 'annotation') as AnnotationTimelineItem;
    expect(annotationItem.metadata.text).toBe('Standalone note');
  });
});

// ============================================================================
// Tests: Artifacts
// ============================================================================

describe('buildTimelineModel - Artifacts', () => {
  it('should attach artifacts to steps', () => {
    const execution = createMockExecution();
    const step = createMockStep({ id: 'step-1' });
    const artifact = createMockArtifact({
      workflow_execution_step_id: 'step-1',
      name: 'build.log',
    });

    const result = buildTimelineModel(execution, [step], [], [artifact]);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.artifacts).toHaveLength(1);
    expect(stepItem.artifacts[0].name).toBe('build.log');
    expect(stepItem.display.hasArtifacts).toBe(true);
  });

  it('should attach artifacts to annotations when associated', () => {
    const execution = createMockExecution();
    const step = createMockStep({ id: 'step-1' });
    const annotation = createMockEvent({
      id: 'annotation-1',
      event_type: 'annotation_added',
      workflow_execution_step_id: 'step-1',
      event_data: { title: 'Note', body: 'Check screenshot' },
      artifacts: [
        {
          id: 'artifact-1',
          workflow_execution_step_id: 'step-1',
          workflow_event_id: 'annotation-1',
          name: 'screenshot.png',
          file_name: 'screenshot.png',
          file_path: '/tmp/screenshot.png',
          file_type: 'image',
          mime_type: 'image/png',
          size_bytes: 2048,
          created_at: new Date(),
        },
      ],
    });

    const result = buildTimelineModel(execution, [step], [annotation], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.annotations).toHaveLength(1);
    expect(stepItem.annotations[0].artifacts).toHaveLength(1);
    expect(stepItem.annotations[0].artifacts[0].name).toBe('screenshot.png');
  });

  it('should not duplicate artifacts in both annotations and step artifacts', () => {
    const execution = createMockExecution();
    const step = createMockStep({ id: 'step-1' });
    const annotation = createMockEvent({
      id: 'annotation-1',
      event_type: 'annotation_added',
      workflow_execution_step_id: 'step-1',
      event_data: { title: 'Note', body: 'Check file' },
      artifacts: [
        {
          id: 'artifact-1',
          workflow_execution_step_id: 'step-1',
          workflow_event_id: 'annotation-1',
          name: 'file.txt',
          file_name: 'file.txt',
          file_path: '/path/file.txt',
          file_type: 'text',
          mime_type: 'text/plain',
          size_bytes: 100,
          created_at: new Date(),
        },
      ],
    });

    // Same artifact also in artifacts array
    const artifact = createMockArtifact({
      id: 'artifact-1',
      workflow_execution_step_id: 'step-1',
      name: 'file.txt',
    });

    const result = buildTimelineModel(execution, [step], [annotation], [artifact]);

    const stepItem = result.items[0] as StepTimelineItem;

    // Artifact should only appear in annotation, not in step.artifacts
    expect(stepItem.annotations[0].artifacts).toHaveLength(1);
    expect(stepItem.artifacts).toHaveLength(0); // Excluded from step artifacts
  });

  it('should show non-annotation artifacts in step artifacts', () => {
    const execution = createMockExecution();
    const step = createMockStep({ id: 'step-1' });
    const artifact1 = createMockArtifact({
      id: 'artifact-1',
      workflow_execution_step_id: 'step-1',
      name: 'build.log',
    });
    const artifact2 = createMockArtifact({
      id: 'artifact-2',
      workflow_execution_step_id: 'step-1',
      name: 'test-results.xml',
    });

    const result = buildTimelineModel(execution, [step], [], [artifact1, artifact2]);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.artifacts).toHaveLength(2);
  });
});

// ============================================================================
// Tests: Event Items
// ============================================================================

describe('buildTimelineModel - Event Items', () => {
  it('should create event items for lifecycle events', () => {
    const execution = createMockExecution();
    const events = [
      createMockEvent({ id: 'event-1', event_type: 'workflow_started' }),
      createMockEvent({ id: 'event-2', event_type: 'phase_started' }),
      createMockEvent({ id: 'event-3', event_type: 'workflow_completed' }),
    ];

    const result = buildTimelineModel(execution, [], events, []);

    expect(result.items).toHaveLength(3);
    expect(result.items.every((item) => item.itemType === 'event')).toBe(true);
  });

  it('should pre-compute event display properties', () => {
    const execution = createMockExecution();
    const event = createMockEvent({
      event_type: 'workflow_started',
      event_data: {
        title: 'Started',
        body: 'Workflow started',
      },
    });

    const result = buildTimelineModel(execution, [], [event], []);

    const eventItem = result.items[0] as EventTimelineItem;
    expect(eventItem.display.icon).toBeDefined();
    expect(eventItem.display.iconColor).toBeDefined();
    expect(eventItem.display.label).toBeDefined();
    expect(eventItem.display.badgeVariant).toBeDefined();
  });

  it('should determine event scope correctly', () => {
    const execution = createMockExecution();
    const workflowEvent = createMockEvent({ event_type: 'workflow_started' });
    const phaseEvent = createMockEvent({ event_type: 'phase_started' });
    const stepEvent = createMockEvent({ event_type: 'step_started' });

    const result = buildTimelineModel(execution, [], [workflowEvent, phaseEvent, stepEvent], []);

    const items = result.items as EventTimelineItem[];
    expect(items[0].metadata.scope).toBe('workflow');
    expect(items[1].metadata.scope).toBe('phase');
    expect(items[2].metadata.scope).toBe('step');
  });

  it('should exclude annotation events from event items', () => {
    const execution = createMockExecution();
    const lifecycleEvent = createMockEvent({ event_type: 'workflow_started' });
    const annotationEvent = createMockEvent({
      event_type: 'annotation_added',
      workflow_execution_step_id: null,
    });

    const result = buildTimelineModel(execution, [], [lifecycleEvent, annotationEvent], []);

    // Should have 1 event item + 1 annotation item
    expect(result.items).toHaveLength(2);
    expect(result.items.filter((i) => i.itemType === 'event')).toHaveLength(1);
    expect(result.items.filter((i) => i.itemType === 'annotation')).toHaveLength(1);
  });
});

// ============================================================================
// Tests: Execution Summary
// ============================================================================

describe('buildTimelineModel - Execution Summary', () => {
  it('should count steps by status', () => {
    const execution = createMockExecution();
    const steps = [
      createMockStep({ id: 'step-1', status: 'completed' }),
      createMockStep({ id: 'step-2', status: 'completed' }),
      createMockStep({ id: 'step-3', status: 'running' }),
      createMockStep({ id: 'step-4', status: 'failed' }),
      createMockStep({ id: 'step-5', status: 'pending', started_at: null }),
    ];

    const result = buildTimelineModel(execution, steps, [], []);

    expect(result.summary.totalSteps).toBe(5);
    expect(result.summary.completedSteps).toBe(2);
    expect(result.summary.runningSteps).toBe(1);
    expect(result.summary.failedSteps).toBe(1);
    expect(result.summary.pendingSteps).toBe(1);
  });

  it('should calculate progress percentage', () => {
    const execution = createMockExecution();
    const steps = [
      createMockStep({ status: 'completed' }),
      createMockStep({ status: 'completed' }),
      createMockStep({ status: 'completed' }),
      createMockStep({ status: 'running' }),
      createMockStep({ status: 'pending', started_at: null }),
    ];

    const result = buildTimelineModel(execution, steps, [], []);

    expect(result.summary.progressPercentage).toBe(60); // 3 of 5 completed = 60%
  });

  it('should calculate total duration for completed execution', () => {
    const execution = createMockExecution({
      started_at: new Date('2025-01-01T00:00:00Z'),
      completed_at: new Date('2025-01-01T01:00:00Z'),
    });

    const result = buildTimelineModel(execution, [], [], []);

    expect(result.summary.duration).toBe(60 * 60 * 1000); // 1 hour in ms
  });

  it('should set duration to null for running execution', () => {
    const execution = createMockExecution({
      status: 'running',
      started_at: new Date('2025-01-01T00:00:00Z'),
      completed_at: null,
    });

    const result = buildTimelineModel(execution, [], [], []);

    expect(result.summary.duration).toBeNull();
  });

  it('should extract current phase from phase_started events', () => {
    const execution = createMockExecution({ current_phase: null });
    const events = [
      createMockEvent({
        event_type: 'phase_started',
        event_data: { phase: 'Setup', title: 'Setup', body: 'Setup started' },
      }),
      createMockEvent({
        event_type: 'phase_started',
        event_data: { phase: 'Build', title: 'Build', body: 'Build started' },
      }),
    ];

    const result = buildTimelineModel(execution, [], events, []);

    expect(result.summary.currentPhase).toBe('Build'); // Latest phase
  });

  it('should use execution.current_phase as fallback', () => {
    const execution = createMockExecution({ current_phase: 'Deploy' });

    const result = buildTimelineModel(execution, [], [], []);

    expect(result.summary.currentPhase).toBe('Deploy');
  });

  it('should determine health status - healthy', () => {
    const execution = createMockExecution({ status: 'running' });
    const steps = [
      createMockStep({ status: 'completed' }),
      createMockStep({ status: 'running' }),
    ];

    const result = buildTimelineModel(execution, steps, [], []);

    expect(result.summary.hasErrors).toBe(false);
    expect(result.summary.overallHealth).toBe('healthy');
  });

  it('should determine health status - critical (failed steps)', () => {
    const execution = createMockExecution({ status: 'running' });
    const steps = [
      createMockStep({ status: 'completed' }),
      createMockStep({ status: 'failed' }),
    ];

    const result = buildTimelineModel(execution, steps, [], []);

    expect(result.summary.hasErrors).toBe(true);
    expect(result.summary.overallHealth).toBe('critical');
  });

  it('should determine health status - critical (failed execution)', () => {
    const execution = createMockExecution({ status: 'failed' });

    const result = buildTimelineModel(execution, [], [], []);

    expect(result.summary.hasErrors).toBe(true);
    expect(result.summary.overallHealth).toBe('critical');
  });

  it('should determine health status - warning (paused)', () => {
    const execution = createMockExecution({ status: 'paused' });

    const result = buildTimelineModel(execution, [], [], []);

    expect(result.summary.hasErrors).toBe(false);
    expect(result.summary.overallHealth).toBe('warning');
  });
});

// ============================================================================
// Tests: Live State
// ============================================================================

describe('buildTimelineModel - Live State', () => {
  it('should detect live execution', () => {
    const execution = createMockExecution({ status: 'running' });

    const result = buildTimelineModel(execution, [], [], []);

    expect(result.liveState.isLive).toBe(true);
  });

  it('should detect non-live execution', () => {
    const execution = createMockExecution({ status: 'completed' });

    const result = buildTimelineModel(execution, [], [], []);

    expect(result.liveState.isLive).toBe(false);
  });

  it('should track running step IDs', () => {
    const execution = createMockExecution();
    const steps = [
      createMockStep({ id: 'step-1', status: 'running' }),
      createMockStep({ id: 'step-2', status: 'completed' }),
      createMockStep({ id: 'step-3', status: 'running' }),
    ];

    const result = buildTimelineModel(execution, steps, [], []);

    expect(result.liveState.runningStepIds).toHaveLength(2);
    expect(result.liveState.runningStepIds).toContain('step-1');
    expect(result.liveState.runningStepIds).toContain('step-3');
  });

  it('should calculate average step duration', () => {
    const execution = createMockExecution();
    const steps = [
      createMockStep({
        started_at: new Date('2025-01-01T00:00:00Z'),
        completed_at: new Date('2025-01-01T00:05:00Z'),
        status: 'completed',
      }),
      createMockStep({
        started_at: new Date('2025-01-01T00:05:00Z'),
        completed_at: new Date('2025-01-01T00:15:00Z'),
        status: 'completed',
      }),
    ];

    const result = buildTimelineModel(execution, steps, [], []);

    // Average of 5 minutes and 10 minutes = 7.5 minutes
    const expectedAvg = (5 * 60 * 1000 + 10 * 60 * 1000) / 2;
    expect(result.liveState.avgStepDuration).toBe(expectedAvg);
  });

  it('should set avgStepDuration to null when no completed steps', () => {
    const execution = createMockExecution();
    const steps = [
      createMockStep({ status: 'running' }),
      createMockStep({ status: 'pending', started_at: null }),
    ];

    const result = buildTimelineModel(execution, steps, [], []);

    expect(result.liveState.avgStepDuration).toBeNull();
  });
});

// ============================================================================
// Tests: Complex Scenarios
// ============================================================================

describe('buildTimelineModel - Complex Scenarios', () => {
  it('should handle complete workflow with all item types', () => {
    const execution = createMockExecution({
      status: 'running',
      current_step: 'Build',
    });

    const steps = [
      createMockStep({
        id: 'step-1',
        step_name: 'Setup',
        status: 'completed',
        started_at: new Date('2025-01-01T00:01:00Z'),
        completed_at: new Date('2025-01-01T00:02:00Z'),
      }),
      createMockStep({
        id: 'step-2',
        step_name: 'Build',
        status: 'running',
        started_at: new Date('2025-01-01T00:02:00Z'),
      }),
    ];

    const events = [
      createMockEvent({
        id: 'event-1',
        event_type: 'workflow_started',
        created_at: new Date('2025-01-01T00:00:00Z'),
      }),
      createMockEvent({
        id: 'event-2',
        event_type: 'phase_started',
        created_at: new Date('2025-01-01T00:01:00Z'),
        event_data: { phase: 'Setup', title: 'Phase', body: 'Started' },
      }),
      createMockEvent({
        id: 'annotation-1',
        event_type: 'annotation_added',
        workflow_execution_step_id: 'step-1',
        created_at: new Date('2025-01-01T00:01:30Z'),
        event_data: { title: 'Note', body: 'Setup note' },
      }),
      createMockEvent({
        id: 'annotation-2',
        event_type: 'annotation_added',
        workflow_execution_step_id: null,
        created_at: new Date('2025-01-01T00:03:00Z'),
        event_data: { title: 'Note', body: 'General note' },
      }),
    ];

    const artifacts = [
      createMockArtifact({
        id: 'artifact-1',
        workflow_execution_step_id: 'step-1',
        name: 'setup.log',
      }),
    ];

    const result = buildTimelineModel(execution, steps, events, artifacts);

    // Should have: 1 workflow_started event, 1 phase_started event, 2 steps, 1 standalone annotation
    expect(result.items).toHaveLength(5);

    // Verify all item types are present
    const eventItems = result.items.filter((i) => i.itemType === 'event');
    const stepItems = result.items.filter((i) => i.itemType === 'step');
    const annotationItems = result.items.filter((i) => i.itemType === 'annotation');

    expect(eventItems).toHaveLength(2); // workflow_started, phase_started
    expect(stepItems).toHaveLength(2); // step-1, step-2
    expect(annotationItems).toHaveLength(1); // standalone annotation

    // Verify chronological order by timestamp
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].timestamp.getTime()).toBeGreaterThanOrEqual(
        result.items[i - 1].timestamp.getTime()
      );
    }

    // Verify step-1 has annotation and artifact
    const step1 = stepItems.find((s) => (s as StepTimelineItem).step.id === 'step-1') as StepTimelineItem;
    expect(step1.annotations).toHaveLength(1);
    expect(step1.artifacts).toHaveLength(1);
  });

  it('should handle multiple steps with mixed statuses', () => {
    const execution = createMockExecution();
    const steps = [
      createMockStep({ id: 'step-1', status: 'completed' }),
      createMockStep({ id: 'step-2', status: 'completed' }),
      createMockStep({ id: 'step-3', status: 'failed', error_message: 'Test failed' }),
      createMockStep({ id: 'step-4', status: 'running' }),
      createMockStep({ id: 'step-5', status: 'skipped' }),
      createMockStep({ id: 'step-6', status: 'pending', started_at: null }),
    ];

    const result = buildTimelineModel(execution, steps, [], []);

    // Only steps with started_at (5 items, excluding pending without started_at)
    expect(result.items).toHaveLength(5);

    // Verify summary counts all steps
    expect(result.summary.totalSteps).toBe(6);
    expect(result.summary.completedSteps).toBe(2);
    expect(result.summary.failedSteps).toBe(1);
    expect(result.summary.runningSteps).toBe(1);
    expect(result.summary.skippedSteps).toBe(1);
    expect(result.summary.pendingSteps).toBe(1);
  });
});

// ============================================================================
// Tests: getExecutionStatusLabel Helper
// ============================================================================

describe('getExecutionStatusLabel', () => {
  it('should return correct labels for all statuses', () => {
    expect(getExecutionStatusLabel('pending')).toBe('Pending');
    expect(getExecutionStatusLabel('running')).toBe('Running');
    expect(getExecutionStatusLabel('paused')).toBe('Paused');
    expect(getExecutionStatusLabel('completed')).toBe('Completed');
    expect(getExecutionStatusLabel('failed')).toBe('Failed');
    expect(getExecutionStatusLabel('cancelled')).toBe('Cancelled');
  });
});

// ============================================================================
// Tests: Edge Cases
// ============================================================================

describe('buildTimelineModel - Edge Cases', () => {
  it('should handle steps with same timestamp', () => {
    const execution = createMockExecution();
    const sameTime = new Date('2025-01-01T00:01:00Z');
    const steps = [
      createMockStep({ id: 'step-1', started_at: sameTime }),
      createMockStep({ id: 'step-2', started_at: sameTime }),
    ];

    const result = buildTimelineModel(execution, steps, [], []);

    expect(result.items).toHaveLength(2);
    // Both items should exist (order may vary but both are present)
  });

  it('should handle zero-duration steps', () => {
    const execution = createMockExecution();
    const time = new Date('2025-01-01T00:01:00Z');
    const step = createMockStep({
      started_at: time,
      completed_at: time, // Same time = 0 duration
      status: 'completed',
    });

    const result = buildTimelineModel(execution, [step], [], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.metadata.duration).toBe(0);
  });

  it('should handle execution with no started_at', () => {
    const execution = createMockExecution({
      started_at: null,
      completed_at: null,
    });

    const result = buildTimelineModel(execution, [], [], []);

    expect(result.summary.duration).toBeNull();
  });

  it('should handle empty event_data', () => {
    const execution = createMockExecution();
    const event = createMockEvent({
      event_type: 'workflow_started',
      event_data: null as any,
    });

    const result = buildTimelineModel(execution, [], [event], []);

    const eventItem = result.items[0] as EventTimelineItem;
    expect(eventItem.metadata.title).toBe('workflow_started'); // Falls back to event_type
    expect(eventItem.metadata.body).toBe('');
  });

  it('should handle steps with null error_message correctly', () => {
    const execution = createMockExecution();
    const step = createMockStep({
      status: 'completed',
      error_message: null,
    });

    const result = buildTimelineModel(execution, [step], [], []);

    const stepItem = result.items[0] as StepTimelineItem;
    expect(stepItem.display.hasError).toBe(false);
    expect(stepItem.debug.hasError).toBe(false);
  });
});
