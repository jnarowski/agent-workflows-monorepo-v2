/**
 * Base event types shared across all CLI adapters
 */

/**
 * Base stream event structure
 * All adapter-specific events extend this base
 */
export interface BaseStreamEvent<T extends string = string, D = unknown> {
  /** Event type identifier */
  type: T;
  /** Event timestamp (Unix timestamp in ms) */
  timestamp?: number;
  /** Event-specific data payload */
  data?: D;
}

/**
 * Generic stream event (for backward compatibility)
 */
export interface StreamEvent extends BaseStreamEvent {
  type: string;
  data?: Record<string, unknown>;
}
