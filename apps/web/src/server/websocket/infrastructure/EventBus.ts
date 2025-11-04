import { EventEmitter } from 'node:events';

/**
 * Workflow Event Bus Singleton
 *
 * Centralized EventEmitter for workflow events that can be imported
 * by workflow services (pauseWorkflow, resumeWorkflow, cancelWorkflow)
 * and consumed by WebSocket handlers.
 *
 * Usage:
 * - Import and use directly: `eventBus.emit('project:123', { type, data })`
 * - Shared across all workflow services
 */
export const eventBus = new EventEmitter();

// Increase max listeners to support multiple event types per project
eventBus.setMaxListeners(50);
