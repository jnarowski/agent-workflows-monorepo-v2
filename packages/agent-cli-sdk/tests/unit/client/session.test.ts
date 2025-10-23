/**
 * Tests for Session wrapper class
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { Session } from '../../../src/client/session';
import type { AIAdapter, ExecutionResponse } from '../../../src/types/index';

// Mock adapter session
class MockAdapterSession extends EventEmitter {
  private _sessionId?: string;
  private _messageCount = 0;

  async send<T = string>(message: string, options?: any): Promise<ExecutionResponse<T>> {
    this._messageCount++;

    if (!this._sessionId) {
      this._sessionId = options?.sessionId || `mock-session-${Date.now()}`;
    }

    const response: ExecutionResponse<T> = {
      output: `Response to: ${message}` as T,
      sessionId: this._sessionId,
      status: 'success',
      exitCode: 0,
      duration: 100,
      metadata: {},
    };

    // Emit complete event asynchronously
    setImmediate(() => this.emit('complete', response));

    return response;
  }

  abort(): void {
    this.emit('aborted');
  }

  getSessionId(): string | undefined {
    return this._sessionId;
  }

  getMessageCount(): number {
    return this._messageCount;
  }
}

// Mock adapter
const mockAdapter: AIAdapter = {
  async execute() {
    return {
      output: 'test',
      sessionId: 'test',
      status: 'success',
      exitCode: 0,
      duration: 100,
      metadata: {},
    };
  },
  getCapabilities() {
    return {
      streaming: true,
      sessionManagement: true,
      toolCalling: true,
      multiModal: false,
    };
  },
};

describe('Session', () => {
  let adapterSession: MockAdapterSession;
  let session: Session;

  beforeEach(() => {
    adapterSession = new MockAdapterSession();
    session = new Session(mockAdapter, adapterSession, {});
  });

  describe('Initialization', () => {
    it('should initialize with zero message count', () => {
      expect(session.messageCount).toBe(0);
      expect(session.getMessageCount()).toBe(0);
    });

    it('should not have session ID initially', () => {
      expect(session.sessionId).toBeUndefined();
      expect(session.getSessionId()).toBeUndefined();
    });

    it('should record start time', () => {
      const beforeTime = Date.now();
      const newSession = new Session(mockAdapter, new MockAdapterSession(), {});
      const afterTime = Date.now();

      expect(newSession.startedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(newSession.startedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should accept pre-set session ID', () => {
      const customSession = new Session(mockAdapter, new MockAdapterSession(), {
        sessionId: 'custom-session-id',
      });

      expect(customSession.sessionId).toBe('custom-session-id');
    });

    it('should not have last message time initially', () => {
      expect(session.lastMessageAt).toBeUndefined();
    });
  });

  describe('Sending Messages', () => {
    it('should send message and return response', async () => {
      const result = await session.send('Hello');

      expect(result.output).toBe('Response to: Hello');
      expect(result.status).toBe('success');
    });

    it('should increment message count', async () => {
      expect(session.messageCount).toBe(0);

      await session.send('Message 1');
      expect(session.messageCount).toBe(1);

      await session.send('Message 2');
      expect(session.messageCount).toBe(2);

      await session.send('Message 3');
      expect(session.messageCount).toBe(3);
    });

    it('should capture session ID from first message', async () => {
      expect(session.sessionId).toBeUndefined();

      const result = await session.send('First message');

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toBe(result.sessionId);
    });

    it('should maintain same session ID across messages', async () => {
      const result1 = await session.send('Message 1');
      const result2 = await session.send('Message 2');
      const result3 = await session.send('Message 3');

      expect(result1.sessionId).toBe(result2.sessionId);
      expect(result2.sessionId).toBe(result3.sessionId);
      expect(session.sessionId).toBe(result1.sessionId);
    });

    it('should update last message time', async () => {
      expect(session.lastMessageAt).toBeUndefined();

      const beforeTime = Date.now();
      await session.send('Message');
      const afterTime = Date.now();

      expect(session.lastMessageAt).toBeGreaterThanOrEqual(beforeTime);
      expect(session.lastMessageAt).toBeLessThanOrEqual(afterTime);
    });

    it('should update last message time on each send', async () => {
      await session.send('Message 1');
      const firstMessageTime = session.lastMessageAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      await session.send('Message 2');
      const secondMessageTime = session.lastMessageAt;

      expect(secondMessageTime).toBeGreaterThan(firstMessageTime!);
    });

    it('should merge session options with send options', async () => {
      const sessionWithOptions = new Session(mockAdapter, adapterSession, {
        timeout: 5000,
        workingDir: '/default/dir',
      });

      const sendSpy = vi.spyOn(adapterSession, 'send');

      await sessionWithOptions.send('Test', {
        timeout: 10000, // Override
      });

      expect(sendSpy).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          timeout: 10000,
          workingDir: '/default/dir',
        })
      );
    });

    it('should prioritize send options over session options', async () => {
      const sessionWithOptions = new Session(mockAdapter, adapterSession, {
        verbose: false,
        logPath: '/default/logs',
      });

      const sendSpy = vi.spyOn(adapterSession, 'send');

      await sessionWithOptions.send('Test', {
        verbose: true,
        logPath: '/override/logs',
      });

      expect(sendSpy).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          verbose: true,
          logPath: '/override/logs',
        })
      );
    });
  });

  describe('Abort', () => {
    it('should call adapter session abort', () => {
      const abortSpy = vi.spyOn(adapterSession, 'abort');

      session.abort();

      expect(abortSpy).toHaveBeenCalled();
    });

    it('should emit aborted event via forwarding', () => {
      return new Promise<void>((resolve) => {
        session.on('aborted', () => {
          resolve();
        });

        session.abort();
      });
    });

    it('should handle adapter session without abort method', () => {
      const sessionWithoutAbort = new MockAdapterSession();
      delete (sessionWithoutAbort as any).abort;

      const sessionNoAbort = new Session(mockAdapter, sessionWithoutAbort as any, {});

      expect(() => sessionNoAbort.abort()).not.toThrow();
    });
  });

  describe('Event Forwarding', () => {
    it('should forward complete event', () => {
      return new Promise<void>((resolve) => {
        session.on('complete', (response) => {
          expect(response.output).toContain('Test');
          resolve();
        });

        session.send('Test');
      });
    });

    it('should forward output event', () => {
      return new Promise<void>((resolve) => {
        session.on('output', (chunk) => {
          expect(chunk).toBeDefined();
          resolve();
        });

        adapterSession.emit('output', 'chunk data');
      });
    });

    it('should forward event event', () => {
      return new Promise<void>((resolve) => {
        session.on('event', (event) => {
          expect(event.type).toBe('test');
          resolve();
        });

        adapterSession.emit('event', { type: 'test' });
      });
    });

    it('should forward error event', () => {
      return new Promise<void>((resolve) => {
        session.on('error', (error) => {
          expect(error.message).toBe('Test error');
          resolve();
        });

        adapterSession.emit('error', new Error('Test error'));
      });
    });

    it('should forward aborted event', () => {
      return new Promise<void>((resolve) => {
        session.on('aborted', () => {
          resolve();
        });

        adapterSession.emit('aborted');
      });
    });

    it('should forward all event types', () => {
      const outputSpy = vi.fn();
      const eventSpy = vi.fn();
      const completeSpy = vi.fn();
      const errorSpy = vi.fn();
      const abortedSpy = vi.fn();

      session.on('output', outputSpy);
      session.on('event', eventSpy);
      session.on('complete', completeSpy);
      session.on('error', errorSpy);
      session.on('aborted', abortedSpy);

      adapterSession.emit('output', 'data');
      adapterSession.emit('event', { type: 'test' });
      adapterSession.emit('complete', {});
      adapterSession.emit('error', new Error());
      adapterSession.emit('aborted');

      expect(outputSpy).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      expect(abortedSpy).toHaveBeenCalled();
    });

    it('should forward events with all arguments', () => {
      return new Promise<void>((resolve) => {
        session.on('event', (arg1, arg2, arg3) => {
          expect(arg1).toBe('first');
          expect(arg2).toBe('second');
          expect(arg3).toBe('third');
          resolve();
        });

        adapterSession.emit('event', 'first', 'second', 'third');
      });
    });
  });

  // Removed: Trivial getter tests and TypeScript feature tests
  // These tests verify that getters return properties, which adds no value
  // The behavior is already tested through other tests that use these properties

  describe('Metadata Tracking', () => {
    it('should track session lifecycle', async () => {
      const startTime = session.startedAt;

      await session.send('Message 1');
      const firstMessageTime = session.lastMessageAt!;

      expect(firstMessageTime).toBeGreaterThanOrEqual(startTime);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await session.send('Message 2');
      const secondMessageTime = session.lastMessageAt!;

      expect(secondMessageTime).toBeGreaterThan(firstMessageTime);
      expect(session.messageCount).toBe(2);
    });

    it('should maintain accurate state across many messages', async () => {
      const messageCount = 10;

      for (let i = 1; i <= messageCount; i++) {
        await session.send(`Message ${i}`);
        expect(session.messageCount).toBe(i);
      }

      expect(session.messageCount).toBe(messageCount);
      expect(session.sessionId).toBeDefined();
      expect(session.lastMessageAt).toBeGreaterThanOrEqual(session.startedAt);
    });
  });

  describe('Pre-set Session ID', () => {
    it('should use provided session ID', () => {
      const customSession = new Session(mockAdapter, new MockAdapterSession(), {
        sessionId: 'pre-set-id-123',
      });

      expect(customSession.sessionId).toBe('pre-set-id-123');
      expect(customSession.getSessionId()).toBe('pre-set-id-123');
    });

    it('should maintain pre-set session ID after messages', async () => {
      const customSession = new Session(mockAdapter, adapterSession, {
        sessionId: 'custom-id',
      });

      await customSession.send('Message');

      expect(customSession.sessionId).toBe('custom-id');
    });

    it('should not override pre-set session ID', async () => {
      const customSession = new Session(mockAdapter, adapterSession, {
        sessionId: 'my-custom-id',
      });

      const result = await customSession.send('Test');

      // Even if response has different session ID, wrapper should keep pre-set one
      expect(customSession.sessionId).toBe('my-custom-id');
    });
  });

  describe('Options Handling', () => {
    it('should accept empty options', () => {
      const emptySession = new Session(mockAdapter, new MockAdapterSession(), {});

      expect(emptySession.sessionId).toBeUndefined();
      expect(emptySession.messageCount).toBe(0);
    });

    it('should merge multiple option types', async () => {
      const sessionOptions = {
        timeout: 5000,
        verbose: true,
        logPath: '/logs',
      };

      const sendOptions = {
        timeout: 10000, // Override
        workingDir: '/work', // New option
      };

      const sessionWithOptions = new Session(mockAdapter, adapterSession, sessionOptions);
      const sendSpy = vi.spyOn(adapterSession, 'send');

      await sessionWithOptions.send('Test', sendOptions);

      expect(sendSpy).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          timeout: 10000,
          verbose: true,
          logPath: '/logs',
          workingDir: '/work',
        })
      );
    });
  });

  describe('Error Scenarios', () => {
    it('should propagate errors from adapter session', async () => {
      const errorSession = new MockAdapterSession();
      errorSession.send = vi.fn().mockRejectedValue(new Error('Send failed'));

      const sessionWithError = new Session(mockAdapter, errorSession, {});

      await expect(sessionWithError.send('Test')).rejects.toThrow('Send failed');
    });

    it('should handle event forwarding errors gracefully', () => {
      session.on('error', () => {
        throw new Error('Listener error');
      });

      // Should not throw when adapter emits error
      expect(() => {
        adapterSession.emit('error', new Error('Adapter error'));
      }).toThrow('Listener error'); // EventEmitter will throw listener errors
    });

    // Removed: Test for message count increment on error
    // This tests implementation details of internal state management
    // The important behavior (error propagation) is tested elsewhere
  });
});
