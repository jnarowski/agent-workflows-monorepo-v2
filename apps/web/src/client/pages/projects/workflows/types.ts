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
  comments?: WorkflowComment[];
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

export interface WorkflowComment {
  id: string;
  workflow_execution_id: string;
  workflow_execution_step_id: string | null;
  comment_type: CommentType;
  content: string;
  created_by: string;
  created_at: Date;
  artifacts?: WorkflowArtifact[];
}

export interface WorkflowArtifact {
  id: string;
  workflow_execution_step_id: string | null;
  workflow_comment_id: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: Date;
}

// Filter types
export interface WorkflowFilter {
  status?: WorkflowStatus;
  search?: string;
  definitionId?: string;
}
