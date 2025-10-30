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
// Combined Types
// ============================================================================

/**
 * Union of all possible channel events
 * Useful for generic event handling
 */
export type AnyChannelEvent = SessionEvent | GlobalEvent | ShellEvent;

/**
 * WebSocket message format sent over the wire
 */
export interface WebSocketMessage {
  channel: string;
  type: string;
  data: unknown;
}
