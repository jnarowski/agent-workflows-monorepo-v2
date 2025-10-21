/**
 * Session-related types
 */

import type { ExecutionResponse } from './interfaces.js';
import type { SendOptions } from './config.js';

/**
 * Session event types
 */
export type SessionEventType = 'output' | 'event' | 'complete' | 'error' | 'aborted';

/**
 * Session event data
 */
export interface SessionEventData {
  output?: string;
  event?: import('./interfaces.js').StreamEvent;
  result?: ExecutionResponse;
  error?: Error;
}

/**
 * Interface that adapter sessions must implement
 * Used by the Session wrapper to abstract adapter-specific session implementations
 */
export interface AdapterSession {
  /**
   * Send a message in the session
   */
  send<T>(message: string, options?: SendOptions): Promise<ExecutionResponse<T>>;

  /**
   * Abort the session (optional)
   */
  abort?(): void;

  /**
   * Register event listener
   */
  on(event: string, callback: (...args: unknown[]) => void): void;

  /**
   * Get session ID (optional)
   */
  getSessionId?(): string | undefined;

  /**
   * Get message count (optional)
   */
  messageCount?: number;
}
