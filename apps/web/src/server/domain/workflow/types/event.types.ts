import type { WorkflowEvent } from '@prisma/client';

// Event types
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

// Comment types (preserved from old CommentType)
export type CommentType = 'user' | 'system' | 'agent';

// Event data map for type-safe event_data
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

// Export WorkflowEvent type from Prisma
export type { WorkflowEvent };
