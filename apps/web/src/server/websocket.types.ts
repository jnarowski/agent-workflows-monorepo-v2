/**
 * WebSocket Type Definitions
 *
 * TypeScript interfaces for WebSocket message structures and data payloads.
 * Used by the WebSocket handler for type-safe message processing.
 */

/**
 * Generic WebSocket message structure
 * All WebSocket messages follow this format with a type and data payload
 *
 * @template T - The type of the data payload
 */
export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
}

/**
 * Payload for session send_message events
 * Represents a user message sent to an AI agent session
 */
export interface SessionSendMessageData {
  message: string;
  images?: string[]; // Array of base64-encoded images or file paths
  config?: Record<string, unknown>;
}

/**
 * Payload for shell input events
 * Represents user input to be sent to a shell session
 */
export interface ShellInputData {
  input: string;
}

/**
 * Payload for shell resize events
 * Represents terminal window resize dimensions
 */
export interface ShellResizeData {
  rows: number;
  cols: number;
}

/**
 * Payload for shell initialization events
 * Configuration for starting a new shell session
 */
export interface ShellInitData {
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Active session data structure
 * Stored in activeSessions Map for managing ongoing agent sessions
 */
export interface ActiveSessionData {
  agentClient: import("@repo/agent-cli-sdk").AgentClient;
  projectPath: string;
  userId: string;
  tempImageDir?: string;
}
