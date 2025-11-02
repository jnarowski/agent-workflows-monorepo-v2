import type { WebSocket } from '@fastify/websocket';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Workflow WebSocket Handler
 * Emits events for workflow execution status changes, steps, comments, and artifacts
 */

// Event types
export type WorkflowEventType =
  | 'workflow.execution.status_changed'
  | 'workflow.execution.phase_changed'
  | 'workflow.step.started'
  | 'workflow.step.completed'
  | 'workflow.step.progress'
  | 'workflow.comment.created'
  | 'workflow.artifact.created'
  | 'workflow.artifact.attached';

export interface WorkflowEvent {
  type: WorkflowEventType;
  data: Record<string, unknown>;
}

/**
 * Emit a workflow event to all connected clients subscribed to the project
 * Note: Actual implementation will integrate with EventBus once created
 */
export function emitWorkflowEvent(
  event: WorkflowEvent,
  logger?: FastifyBaseLogger
): void {
  // STUB: Future implementation will broadcast to connected WebSocket clients
  logger?.debug({ event }, 'Workflow event emitted (stub)');

  // Future: Use EventBus to broadcast event to subscribers
  // eventBus.emit(event.type, event.data);
}

/**
 * Send workflow event to a specific socket
 */
export function sendWorkflowEvent(
  socket: WebSocket,
  event: WorkflowEvent
): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

/**
 * Handle workflow WebSocket messages
 * Note: WebSocket handler registration will be added when integrating with EventBus
 */
export async function handleWorkflowMessage(
  message: unknown,
  _socket: WebSocket,
  logger: FastifyBaseLogger
): Promise<void> {
  logger.debug({ message }, 'Workflow message received (stub)');

  // Future: Handle workflow control messages
  // - Subscribe to workflow execution updates
  // - Request step logs
  // - Send control commands (pause/resume/cancel)
}
