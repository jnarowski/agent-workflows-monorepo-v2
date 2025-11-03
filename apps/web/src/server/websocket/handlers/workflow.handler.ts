import type { EventEmitter } from 'node:events';
import type { FastifyBaseLogger } from 'fastify';
import { Channels, WorkflowEventTypes } from '@/shared/websocket/index';
import { broadcast } from '../infrastructure/subscriptions';
import type {
  WorkflowStartedData,
  WorkflowStepStartedData,
  WorkflowStepCompletedData,
  WorkflowStepFailedData,
  WorkflowPhaseCompletedData,
  WorkflowCompletedData,
  WorkflowFailedData,
  WorkflowPausedData,
  WorkflowResumedData,
  WorkflowCancelledData,
  WorkflowCommentCreatedData,
} from '@/shared/websocket/types';

/**
 * Workflow WebSocket Handler
 *
 * Listens to EventBus events from MockWorkflowOrchestrator and broadcasts
 * to WebSocket clients subscribed to project channels.
 *
 * Pattern: Room-based broadcasting
 * - Events scoped to project:${projectId} channels
 * - Clients subscribe to project channels and filter by executionId
 * - Generic event names (workflow:step:completed) not per-execution names
 */

/**
 * Register workflow event listeners on the EventBus
 *
 * @param eventBus - Node EventEmitter instance from MockWorkflowOrchestrator
 * @param logger - Optional Fastify logger
 */
export function registerWorkflowEventListeners(
  eventBus: EventEmitter,
  logger?: FastifyBaseLogger
): void {
  logger?.info('Registering workflow WebSocket event listeners');

  // Workflow started
  eventBus.on('workflow:started', (data: WorkflowStartedData) => {
    logger?.debug({ data }, 'Workflow started event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.STARTED,
      data,
    });
  });

  // Step started
  eventBus.on('workflow:step:started', (data: WorkflowStepStartedData) => {
    logger?.debug({ data }, 'Workflow step started event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.STEP_STARTED,
      data,
    });
  });

  // Step completed
  eventBus.on('workflow:step:completed', (data: WorkflowStepCompletedData) => {
    logger?.debug({ data }, 'Workflow step completed event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.STEP_COMPLETED,
      data,
    });
  });

  // Step failed
  eventBus.on('workflow:step:failed', (data: WorkflowStepFailedData) => {
    logger?.debug({ data }, 'Workflow step failed event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.STEP_FAILED,
      data,
    });
  });

  // Phase completed
  eventBus.on('workflow:phase:completed', (data: WorkflowPhaseCompletedData) => {
    logger?.debug({ data }, 'Workflow phase completed event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.PHASE_COMPLETED,
      data,
    });
  });

  // Workflow completed
  eventBus.on('workflow:completed', (data: WorkflowCompletedData) => {
    logger?.info({ data }, 'Workflow completed event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.COMPLETED,
      data,
    });
  });

  // Workflow failed
  eventBus.on('workflow:failed', (data: WorkflowFailedData) => {
    logger?.warn({ data }, 'Workflow failed event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.FAILED,
      data,
    });
  });

  // Workflow paused
  eventBus.on('workflow:paused', (data: WorkflowPausedData) => {
    logger?.debug({ data }, 'Workflow paused event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.PAUSED,
      data,
    });
  });

  // Workflow resumed
  eventBus.on('workflow:resumed', (data: WorkflowResumedData) => {
    logger?.debug({ data }, 'Workflow resumed event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.RESUMED,
      data,
    });
  });

  // Workflow cancelled
  eventBus.on('workflow:cancelled', (data: WorkflowCancelledData) => {
    logger?.debug({ data }, 'Workflow cancelled event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.CANCELLED,
      data,
    });
  });

  // Comment created
  eventBus.on('workflow:comment:created', (data: WorkflowCommentCreatedData) => {
    logger?.debug({ data }, 'Workflow comment created event');
    broadcast(Channels.project(data.projectId), {
      type: WorkflowEventTypes.COMMENT_CREATED,
      data,
    });
  });

  logger?.info('Workflow WebSocket event listeners registered (12 events)');
}
