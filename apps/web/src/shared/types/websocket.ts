/**
 * WebSocket Types
 *
 * Shared types for the unified WebSocket connection architecture.
 * Uses flat event naming convention: `session.{id}.action`, `shell.{id}.action`, `global.action`
 */

/**
 * WebSocket ready states
 */
export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
}

/**
 * Session event types
 */
export type SessionEventName =
  | `session.${string}.stream_output`
  | `session.${string}.message_complete`
  | `session.${string}.error`
  | `session.${string}.send_message`;

/**
 * Shell event types
 */
export type ShellEventName =
  | `shell.${string}.output`
  | `shell.${string}.exit`
  | `shell.${string}.initialized`
  | `shell.${string}.input`
  | `shell.${string}.resize`
  | `shell.${string}.init`;

/**
 * Global event types
 */
export type GlobalEventName =
  | "global.connected"
  | "global.error"
  | "global.disconnected";

/**
 * All possible WebSocket event names
 */
export type WebSocketEventName =
  | SessionEventName
  | ShellEventName
  | GlobalEventName;

/**
 * Session event data types
 */
export interface SessionStreamOutputData {
  content: {
    events: unknown[]; // Array of content blocks from Claude API
  };
}

export interface SessionMessageCompleteData {
  metadata: {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
    stop_reason?: string;
  };
}

export interface SessionErrorData {
  error: string;
  message?: string;
}

export interface SessionSendMessageData {
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Shell event data types
 */
export interface ShellOutputData {
  output: string;
}

export interface ShellExitData {
  code: number;
  signal?: string;
}

export interface ShellInitializedData {
  shellId: string;
  ready: boolean;
}

export interface ShellInputData {
  input: string;
}

export interface ShellResizeData {
  rows: number;
  cols: number;
}

export interface ShellInitData {
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Global event data types
 */
export interface GlobalConnectedData {
  timestamp: number;
  userId?: string;
}

export interface GlobalErrorData {
  error: string;
  message?: string;
}
