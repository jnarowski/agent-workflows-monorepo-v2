// Workflow execution status
export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Workflow step status
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// Workflow execution input for creation
export interface CreateWorkflowExecutionInput {
  project_id: string;
  user_id: string;
  workflow_definition_id: string;
  name: string;
  args: Record<string, unknown>;
  inngest_run_id?: string;
}

// Workflow execution filters for querying
export interface WorkflowExecutionFilters {
  project_id?: string;
  user_id?: string;
  status?: WorkflowStatus;
}
