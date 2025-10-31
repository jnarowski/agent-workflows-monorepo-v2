/**
 * Shared WebSocket Types and Utilities
 *
 * Barrel export for all shared WebSocket types, constants, builders, and guards.
 * Both frontend and backend should import from this module to ensure type parity.
 *
 * @example Backend usage:
 * import { SessionEventTypes, Channels } from '@/shared/websocket'
 * broadcast(Channels.session(id), { type: SessionEventTypes.STREAM_OUTPUT, data: {...} })
 *
 * @example Frontend usage:
 * import { SessionEvent, SessionEventTypes, Channels } from '@/shared/websocket'
 * eventBus.on<SessionEvent>(Channels.session(id), (event) => {
 *   switch (event.type) {
 *     case SessionEventTypes.STREAM_OUTPUT:
 *       // Handle with type safety
 *   }
 * })
 */

// Export all types
export type * from './types'
export * from './types'

// Export channel builders and utilities
export * from './channels'

// Export type guards
export * from './guards'
