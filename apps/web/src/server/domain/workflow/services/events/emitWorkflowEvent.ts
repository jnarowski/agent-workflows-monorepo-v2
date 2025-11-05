import { eventBus } from "@/server/websocket/infrastructure/EventBus";
import type { WorkflowWebSocketEvent } from "@/shared/types/websocket.types";

/**
 * Emit workflow WebSocket event to project room
 *
 * Centralized helper for emitting workflow events via the EventBus.
 * All events are broadcast to the project:${projectId} room.
 * Client-side filtering is handled efficiently by React Query cache.
 *
 * @param projectId - Project ID for room targeting
 * @param event - Workflow WebSocket event (type-safe discriminated union)
 *
 * @example
 * ```typescript
 * emitWorkflowEvent('project-123', {
 *   type: 'workflow:execution:updated',
 *   data: {
 *     execution_id: 'exec-1',
 *     project_id: 'project-123',
 *     changes: { status: 'running', started_at: new Date() }
 *   }
 * });
 * ```
 */
export function emitWorkflowEvent(
  projectId: string,
  event: WorkflowWebSocketEvent
): void {
  // Emit to project room channel
  // WebSocket infrastructure listens to this event and broadcasts to connected clients
  eventBus.emit(`project:${projectId}`, event);
}
