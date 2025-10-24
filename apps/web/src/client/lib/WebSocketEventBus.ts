/**
 * WebSocketEventBus
 *
 * A lightweight event emitter for pub/sub pattern in the WebSocket architecture.
 * Allows components to subscribe to specific WebSocket events without managing connections.
 */

type EventHandler<T = unknown> = (data: T) => void;

export class WebSocketEventBus {
  private listeners: Map<string, Set<EventHandler<unknown>>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param event The event name to listen for
   * @param handler The function to call when the event is emitted
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>);
  }

  /**
   * Unsubscribe from an event
   * @param event The event name to stop listening for
   * @param handler The function to remove
   */
  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<unknown>);
      // Clean up empty sets
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribed handlers
   * @param event The event name to emit
   * @param data The data to pass to handlers
   */
  emit<T = unknown>(event: string, data: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[EventBus] Error in handler for event "${event}":`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event and automatically unsubscribe after first emission
   * @param event The event name to listen for
   * @param handler The function to call once when the event is emitted
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): void {
    const onceHandler = (data: T) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * Remove all listeners for all events
   * Useful for cleanup
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of listeners for a specific event (useful for debugging)
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
