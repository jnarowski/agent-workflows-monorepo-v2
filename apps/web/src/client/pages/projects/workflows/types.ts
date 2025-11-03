// Frontend types for workflow feature
// Matches backend Prisma schema

export const WorkflowStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type WorkflowStatus = typeof WorkflowStatus[keyof typeof WorkflowStatus];

export const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type StepStatus = typeof StepStatus[keyof typeof StepStatus];

export const CommentType = {
  USER: 'user',
  SYSTEM: 'system',
  AGENT: 'agent',
} as const;

export type CommentType = typeof CommentType[keyof typeof CommentType];

// Workflow event types (matching backend)
export type WorkflowEventType =
  | 'comment_added'
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_paused'
  | 'workflow_resumed'
  | 'workflow_cancelled'
  | 'phase_started'
  | 'phase_completed'
  | 'step_started';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  phases: Phase[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args_schema: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface Phase {
  name: string;
  steps: string[];
}

export interface WorkflowExecution {
  id: string;
  workflow_definition_id: string;
  workflow_definition?: WorkflowDefinition;
  project_id: string;
  name: string;
  status: WorkflowStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any> | null;
  current_step: string | null;
  current_phase: string | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  steps?: WorkflowExecutionStep[];
  events?: WorkflowEvent[];
  artifacts?: WorkflowArtifact[];
}

export interface WorkflowExecutionStep {
  id: string;
  workflow_execution_id: string;
  step_name: string;
  phase_name: string;
  status: StepStatus;
  logs: string | null;
  error_message: string | null;
  agent_session_id: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  artifacts?: WorkflowArtifact[];
}

// User information interface (for created_by_user relation)
export interface User {
  id: string;
  username: string;
}

// Event data type map (matching backend EventDataMap)
export interface EventDataMap {
  comment_added: {
    text: string;
    comment_type: CommentType;
  };
  workflow_started: Record<string, never>; // Empty object
  workflow_completed: Record<string, never>;
  workflow_failed: {
    error_message?: string;
  };
  workflow_paused: {
    user_id?: string;
    reason?: string;
  };
  workflow_resumed: {
    user_id?: string;
  };
  workflow_cancelled: {
    user_id?: string;
    reason?: string;
  };
  phase_started: {
    phase_name: string;
  };
  phase_completed: {
    phase_name: string;
  };
  step_started: {
    step_id: string;
    step_name: string;
  };
}

// WorkflowEvent interface (replaces WorkflowComment)
export interface WorkflowEvent {
  id: string;
  workflow_execution_id: string;
  workflow_execution_step_id: string | null;
  event_type: WorkflowEventType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event_data: any; // JSON field, type-safe access via EventDataMap
  created_by_user_id: string | null;
  created_at: Date;
  created_by_user?: User | null;
  workflow_execution_step?: WorkflowExecutionStep | null;
  artifacts?: WorkflowArtifact[];
}

export interface WorkflowArtifact {
  id: string;
  workflow_execution_step_id: string | null;
  workflow_event_id: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: Date;
}

// Timeline discriminated union type
export type TimelineItem =
  | { type: 'step'; data: WorkflowExecutionStep; timestamp: Date }
  | { type: 'event'; data: WorkflowEvent; timestamp: Date };

// Filter types
export interface WorkflowFilter {
  status?: WorkflowStatus;
  search?: string;
  definitionId?: string;
}
