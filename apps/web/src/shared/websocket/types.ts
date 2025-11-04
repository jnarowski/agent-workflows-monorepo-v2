/**
 * Shared WebSocket Type Definitions
 *
 * This file defines the core types for our Phoenix Channels-based WebSocket architecture.
 * All event types, constants, and data interfaces are defined here and shared between
 * frontend and backend to ensure type parity.
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * WebSocket ready states (matching browser WebSocket API)
 */
export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

/**
 * Base channel event structure with discriminated union support
 */
export interface ChannelEvent<T = string, D = unknown> {
  type: T;
  data: D;
}

// ============================================================================
// Session Events
// ============================================================================

/**
 * Session event type constants
 * Used for session:* channels (agent streaming, message handling)
 */
export const SessionEventTypes = {
  CANCEL: "cancel",
  ERROR: "error",
  MESSAGE_COMPLETE: "message_complete",
  SEND_MESSAGE: "send_message",
  SESSION_UPDATED: "session_updated",
  STREAM_OUTPUT: "stream_output",
  SUBSCRIBE: "subscribe",
  SUBSCRIBE_SUCCESS: "subscribe_success",
} as const;

/**
 * Data interfaces for session events
 */
export interface StreamOutputData {
  message: string;
  sessionId: string;
  timestamp?: number;
}

export interface MessageCompleteData {
  sessionId: string;
  messageId?: string;
  timestamp?: number;
}

export interface SessionErrorData {
  error: string;
  sessionId: string;
  code?: string;
  timestamp?: number;
}

export interface SubscribeSuccessData {
  channel: string;
  timestamp?: number;
}

export interface SessionUpdatedData {
  sessionId: string;
  state?: 'idle' | 'working' | 'error';
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  name?: string;
  updated_at?: Date | string;
}

/**
 * Discriminated union for all session events
 * Enables exhaustive type checking with TypeScript's never type
 */
export type SessionEvent =
  | {
      type: typeof SessionEventTypes.STREAM_OUTPUT;
      data: StreamOutputData;
    }
  | {
      type: typeof SessionEventTypes.MESSAGE_COMPLETE;
      data: MessageCompleteData;
    }
  | {
      type: typeof SessionEventTypes.ERROR;
      data: SessionErrorData;
    }
  | {
      type: typeof SessionEventTypes.SUBSCRIBE_SUCCESS;
      data: SubscribeSuccessData;
    }
  | {
      type: typeof SessionEventTypes.SESSION_UPDATED;
      data: SessionUpdatedData;
    };

// ============================================================================
// Global Events
// ============================================================================

/**
 * Global event type constants
 * Used for global channel (connection, heartbeat, subscriptions)
 */
export const GlobalEventTypes = {
  CONNECTED: "connected",
  ERROR: "error",
  PING: "ping",
  PONG: "pong",
  SUBSCRIPTION_SUCCESS: "subscription_success",
  SUBSCRIPTION_ERROR: "subscription_error",
} as const;

/**
 * Data interfaces for global events
 */
export interface ConnectedData {
  timestamp: number;
  clientId?: string;
}

export interface GlobalErrorData {
  error: string;
  code?: string;
  timestamp?: number;
}

export interface PingData {
  timestamp: number;
}

export interface PongData {
  timestamp: number;
}

export interface SubscriptionSuccessData {
  channel: string;
  timestamp?: number;
}

export interface SubscriptionErrorData {
  channel: string;
  error: string;
  timestamp?: number;
}

/**
 * Discriminated union for all global events
 */
export type GlobalEvent =
  | {
      type: typeof GlobalEventTypes.CONNECTED;
      data: ConnectedData;
    }
  | {
      type: typeof GlobalEventTypes.ERROR;
      data: GlobalErrorData;
    }
  | {
      type: typeof GlobalEventTypes.PING;
      data: PingData;
    }
  | {
      type: typeof GlobalEventTypes.PONG;
      data: PongData;
    }
  | {
      type: typeof GlobalEventTypes.SUBSCRIPTION_SUCCESS;
      data: SubscriptionSuccessData;
    }
  | {
      type: typeof GlobalEventTypes.SUBSCRIPTION_ERROR;
      data: SubscriptionErrorData;
    };

// ============================================================================
// Shell Events
// ============================================================================

/**
 * Shell event type constants
 * Used for shell:* channels (terminal PTY streams)
 *
 * Note: Shell WebSocket uses a separate connection from session WebSocket
 * See .agent/docs/websockets.md for architectural rationale
 */
export const ShellEventTypes = {
  INIT: "init",
  INPUT: "input",
  OUTPUT: "output",
  RESIZE: "resize",
  EXIT: "exit",
  ERROR: "error",
} as const;

/**
 * Data interfaces for shell events
 */
export interface ShellInitData {
  shellId: string;
  rows: number;
  cols: number;
  timestamp?: number;
}

export interface ShellInputData {
  shellId: string;
  data: string;
}

export interface ShellOutputData {
  shellId: string;
  data: string;
}

export interface ShellResizeData {
  shellId: string;
  rows: number;
  cols: number;
}

export interface ShellExitData {
  shellId: string;
  code: number;
  timestamp?: number;
}

export interface ShellErrorData {
  shellId: string;
  error: string;
  code?: string;
  timestamp?: number;
}

/**
 * Discriminated union for all shell events
 */
export type ShellEvent =
  | {
      type: typeof ShellEventTypes.INIT;
      data: ShellInitData;
    }
  | {
      type: typeof ShellEventTypes.INPUT;
      data: ShellInputData;
    }
  | {
      type: typeof ShellEventTypes.OUTPUT;
      data: ShellOutputData;
    }
  | {
      type: typeof ShellEventTypes.RESIZE;
      data: ShellResizeData;
    }
  | {
      type: typeof ShellEventTypes.EXIT;
      data: ShellExitData;
    }
  | {
      type: typeof ShellEventTypes.ERROR;
      data: ShellErrorData;
    };

// ============================================================================
// Workflow Events
// ============================================================================

/**
 * Workflow event type constants
 * Used for project:* channels (workflow execution lifecycle)
 *
 * Note: Uses room-based broadcasting - all events scoped to project rooms
 * Clients filter by executionId in the payload
 */
export const WorkflowEventTypes = {
  CREATED: "workflow:created",
  STARTED: "workflow:started",
  STEP_STARTED: "workflow:step:started",
  STEP_COMPLETED: "workflow:step:completed",
  STEP_FAILED: "workflow:step:failed",
  PHASE_COMPLETED: "workflow:phase:completed",
  COMPLETED: "workflow:completed",
  FAILED: "workflow:failed",
  PAUSED: "workflow:paused",
  RESUMED: "workflow:resumed",
  CANCELLED: "workflow:cancelled",
  ANNOTATION_CREATED: "workflow:annotation:created",
} as const;

/**
 * Data interfaces for workflow events
 */
export interface WorkflowCreatedData {
  executionId: string;
  projectId: string;
  definitionId: string;
  timestamp: string;
}

export interface WorkflowStartedData {
  executionId: string;
  projectId: string;
  timestamp: string;
}

export interface WorkflowStepStartedData {
  executionId: string;
  projectId: string;
  stepId: string;
  stepName: string;
  phase: string;
  timestamp: string;
}

export interface WorkflowStepCompletedData {
  executionId: string;
  projectId: string;
  stepId: string;
  stepName: string;
  phase: string;
  logs: string;
  timestamp: string;
}

export interface WorkflowStepFailedData {
  executionId: string;
  projectId: string;
  stepId: string;
  stepName: string;
  phase: string;
  error: string;
  timestamp: string;
}

export interface WorkflowPhaseCompletedData {
  executionId: string;
  projectId: string;
  phase: string;
  timestamp: string;
}

export interface WorkflowCompletedData {
  executionId: string;
  projectId: string;
  timestamp: string;
}

export interface WorkflowFailedData {
  executionId: string;
  projectId: string;
  error: string;
  timestamp: string;
}

export interface WorkflowPausedData {
  executionId: string;
  projectId: string;
  timestamp: string;
}

export interface WorkflowResumedData {
  executionId: string;
  projectId: string;
  timestamp: string;
}

export interface WorkflowCancelledData {
  executionId: string;
  projectId: string;
  timestamp: string;
}

export interface WorkflowAnnotationCreatedData {
  executionId: string;
  projectId: string;
  commentId: string;
  text: string;
  body?: string; // Alternative field name for compatibility
  stepId?: string;
  userId: string | null;
  timestamp: string;
}

/**
 * Discriminated union for all workflow events
 */
export type WorkflowEvent =
  | {
      type: typeof WorkflowEventTypes.CREATED;
      data: WorkflowCreatedData;
    }
  | {
      type: typeof WorkflowEventTypes.STARTED;
      data: WorkflowStartedData;
    }
  | {
      type: typeof WorkflowEventTypes.STEP_STARTED;
      data: WorkflowStepStartedData;
    }
  | {
      type: typeof WorkflowEventTypes.STEP_COMPLETED;
      data: WorkflowStepCompletedData;
    }
  | {
      type: typeof WorkflowEventTypes.STEP_FAILED;
      data: WorkflowStepFailedData;
    }
  | {
      type: typeof WorkflowEventTypes.PHASE_COMPLETED;
      data: WorkflowPhaseCompletedData;
    }
  | {
      type: typeof WorkflowEventTypes.COMPLETED;
      data: WorkflowCompletedData;
    }
  | {
      type: typeof WorkflowEventTypes.FAILED;
      data: WorkflowFailedData;
    }
  | {
      type: typeof WorkflowEventTypes.PAUSED;
      data: WorkflowPausedData;
    }
  | {
      type: typeof WorkflowEventTypes.RESUMED;
      data: WorkflowResumedData;
    }
  | {
      type: typeof WorkflowEventTypes.CANCELLED;
      data: WorkflowCancelledData;
    }
  | {
      type: typeof WorkflowEventTypes.ANNOTATION_CREATED;
      data: WorkflowAnnotationCreatedData;
    };

// ============================================================================
// Combined Types
// ============================================================================

/**
 * Union of all possible channel events
 * Useful for generic event handling
 */
export type AnyChannelEvent = SessionEvent | GlobalEvent | ShellEvent | WorkflowEvent;

/**
 * WebSocket message format sent over the wire
 */
export interface WebSocketMessage {
  channel: string;
  type: string;
  data: unknown;
}
