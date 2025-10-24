import { describe, it, expect, vi } from 'vitest';
import { WebSocketEventBus } from './WebSocketEventBus';

describe('WebSocketEventBus', () => {
  it('should subscribe and emit events', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    bus.on('test.event', handler);
    bus.emit('test.event', { message: 'hello' });

    expect(handler).toHaveBeenCalledWith({ message: 'hello' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe correctly', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    bus.on('test.event', handler);
    bus.emit('test.event', 'first');
    expect(handler).toHaveBeenCalledTimes(1);

    bus.off('test.event', handler);
    bus.emit('test.event', 'second');
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
  });

  it('should auto-unsubscribe with once()', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    bus.once('test.event', handler);
    bus.emit('test.event', 'first');
    expect(handler).toHaveBeenCalledWith('first');
    expect(handler).toHaveBeenCalledTimes(1);

    bus.emit('test.event', 'second');
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, auto-unsubscribed
  });

  it('should support multiple handlers for same event', () => {
    const bus = new WebSocketEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('test.event', handler1);
    bus.on('test.event', handler2);
    bus.emit('test.event', 'data');

    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');
  });

  it('should not error when emitting to event with no handlers', () => {
    const bus = new WebSocketEventBus();

    expect(() => {
      bus.emit('nonexistent.event', 'data');
    }).not.toThrow();
  });

  it('should clean up empty handler sets after unsubscribe', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    bus.on('test.event', handler);
    expect(bus.listenerCount('test.event')).toBe(1);

    bus.off('test.event', handler);
    expect(bus.listenerCount('test.event')).toBe(0);
  });

  it('should clear all listeners', () => {
    const bus = new WebSocketEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('event1', handler1);
    bus.on('event2', handler2);
    expect(bus.listenerCount('event1')).toBe(1);
    expect(bus.listenerCount('event2')).toBe(1);

    bus.clear();
    expect(bus.listenerCount('event1')).toBe(0);
    expect(bus.listenerCount('event2')).toBe(0);
  });

  it('should catch and log errors in handlers without stopping other handlers', () => {
    const bus = new WebSocketEventBus();
    const errorHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    const successHandler = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.on('test.event', errorHandler);
    bus.on('test.event', successHandler);
    bus.emit('test.event', 'data');

    expect(errorHandler).toHaveBeenCalled();
    expect(successHandler).toHaveBeenCalledWith('data');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle type-safe events', () => {
    const bus = new WebSocketEventBus();

    interface TestData {
      id: string;
      value: number;
    }

    const handler = vi.fn<[TestData], void>();

    bus.on<TestData>('typed.event', handler);
    bus.emit<TestData>('typed.event', { id: 'test', value: 42 });

    expect(handler).toHaveBeenCalledWith({ id: 'test', value: 42 });
  });

  it('should return correct listener count', () => {
    const bus = new WebSocketEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    expect(bus.listenerCount('test.event')).toBe(0);

    bus.on('test.event', handler1);
    expect(bus.listenerCount('test.event')).toBe(1);

    bus.on('test.event', handler2);
    bus.on('test.event', handler3);
    expect(bus.listenerCount('test.event')).toBe(3);

    bus.off('test.event', handler1);
    expect(bus.listenerCount('test.event')).toBe(2);
  });

  it('should not add duplicate handlers', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    bus.on('test.event', handler);
    bus.on('test.event', handler); // Add same handler again
    bus.emit('test.event', 'data');

    // Should only be called once because Set deduplicates
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
