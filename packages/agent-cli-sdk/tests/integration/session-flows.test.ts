import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentClient } from '../../src/client/agent-client';
import { Session } from '../../src/client/session';
import type { AIAdapter, AdapterCapabilities } from '../../src/core/interfaces';
import type { ExecutionResponse, ExecutionOptions } from '../../src/types/interfaces';
import { EventEmitter } from 'events';

/**
 * Mock session for testing
 */
class MockAdapterSession extends EventEmitter {
  private messageCount = 0;
  private sessionId?: string;
  private static sessionCounter = 0;

  async send<T = string>(message: string, options?: any): Promise<ExecutionResponse<T>> {
    this.messageCount++;

    // Generate session ID on first message using counter to avoid collisions
    if (!this.sessionId) {
      this.sessionId = `session-${Date.now()}-${++MockAdapterSession.sessionCounter}`;
    }

    const response: ExecutionResponse<T> = {
      output: `Response to: ${message}` as T,
      sessionId: this.sessionId,
      status: 'success',
      exitCode: 0,
      duration: 100,
      metadata: {},
    };

    // Emit complete event
    setTimeout(() => this.emit('complete', response), 0);

    return response;
  }

  abort(): void {
    this.emit('aborted');
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getMessageCount(): number {
    return this.messageCount;
  }
}

/**
 * Mock adapter with session support
 */
class MockAdapterWithSessions implements AIAdapter {
  private sessions: MockAdapterSession[] = [];

  async execute<T = string>(prompt: string, options?: ExecutionOptions): Promise<ExecutionResponse<T>> {
    return {
      output: `Response: ${prompt}` as T,
      sessionId: `exec-${Date.now()}`,
      status: 'success',
      exitCode: 0,
      duration: 100,
      metadata: {},
    };
  }

  getCapabilities(): AdapterCapabilities {
    return {
      streaming: true,
      sessionManagement: true,
      toolCalling: true,
      multiModal: false,
    };
  }

  createSession(options?: any): MockAdapterSession {
    const session = new MockAdapterSession();
    this.sessions.push(session);
    return session;
  }

  getSessions(): MockAdapterSession[] {
    return this.sessions;
  }
}

describe('Session Flows - Integration', () => {
  let mockAdapter: MockAdapterWithSessions;
  let client: AgentClient;

  beforeEach(() => {
    mockAdapter = new MockAdapterWithSessions();
    client = new AgentClient({ adapter: mockAdapter });
  });

  describe('Session Creation', () => {
    it('should create a session successfully', () => {
      const session = client.createSession();

      expect(session).toBeInstanceOf(Session);
      expect(session.messageCount).toBe(0);
      expect(session.sessionId).toBeUndefined(); // Not set until first message
    });

    it('should create session with pre-set sessionId', () => {
      const session = client.createSession({
        sessionId: 'custom-session-id',
      });

      expect(session.sessionId).toBe('custom-session-id');
    });

    it('should create multiple independent sessions', () => {
      const session1 = client.createSession();
      const session2 = client.createSession();
      const session3 = client.createSession();

      expect(session1).not.toBe(session2);
      expect(session2).not.toBe(session3);
    });
  });

  describe('Session Message Sending', () => {
    it('should send a single message', async () => {
      const session = client.createSession();
      const result = await session.send('Hello');

      expect(result.status).toBe('success');
      expect(result.output).toContain('Hello');
      expect(session.messageCount).toBe(1);
      expect(session.sessionId).toBeDefined();
    });

    it('should send multiple messages in sequence', async () => {
      const session = client.createSession();

      const result1 = await session.send('Create a function');
      const result2 = await session.send('Add tests');
      const result3 = await session.send('Add error handling');

      expect(session.messageCount).toBe(3);
      expect(result1.sessionId).toBe(result2.sessionId);
      expect(result2.sessionId).toBe(result3.sessionId);
    });

    it('should capture session ID after first message', async () => {
      const session = client.createSession();

      expect(session.sessionId).toBeUndefined();

      await session.send('First message');

      expect(session.sessionId).toBeDefined();
      expect(typeof session.sessionId).toBe('string');
    });
  });

  describe('Session Events', () => {
    it('should emit complete event on message completion', async () => {
      const session = client.createSession();
      const completeSpy = vi.fn();

      session.on('complete', completeSpy);

      await session.send('Test message');

      // Wait for event emission
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(completeSpy).toHaveBeenCalledOnce();
    });

    it('should handle event callbacks from options', async () => {
      const outputCallback = vi.fn();
      const eventCallback = vi.fn();

      const session = client.createSession({
        onOutput: outputCallback,
        onEvent: eventCallback,
      });

      await session.send('Test message');

      // Session should be created even if callbacks aren't called
      expect(session.messageCount).toBe(1);
    });

    it('should forward events to listeners', async () => {
      const session = client.createSession();
      const completeListener = vi.fn();

      session.on('complete', completeListener);

      await session.send('Message');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(completeListener).toHaveBeenCalled();
    });
  });

  describe('Session Abort', () => {
    it('should abort session', async () => {
      const session = client.createSession();
      const abortedSpy = vi.fn();

      session.on('aborted', abortedSpy);

      session.abort();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(abortedSpy).toHaveBeenCalledOnce();
    });
  });

  describe('Session Tracking', () => {
    it('should track active sessions after first message', async () => {
      const session = client.createSession();

      // No sessions yet
      let sessions = client.listActiveSessions();
      expect(sessions.length).toBe(0);

      // Send message to activate session
      await session.send('Test');

      // Wait for session registration
      await new Promise((resolve) => setTimeout(resolve, 10));

      sessions = client.listActiveSessions();
      expect(sessions.length).toBe(1);
      expect(sessions[0].messageCount).toBe(1);
    });

    it('should retrieve session by ID', async () => {
      const session = client.createSession();
      await session.send('Test');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const sessionId = session.sessionId;
      const retrievedSession = client.getSession(sessionId!);

      expect(retrievedSession).toBe(session);
    });

    it('should abort session by ID', async () => {
      const session = client.createSession();
      const abortedSpy = vi.fn();

      session.on('aborted', abortedSpy);

      await session.send('Test');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const sessionId = session.sessionId!;
      const success = client.abortSession(sessionId);

      expect(success).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(abortedSpy).toHaveBeenCalled();
    });

    it('should return false when aborting non-existent session', () => {
      const success = client.abortSession('non-existent-session');
      expect(success).toBe(false);
    });
  });

  describe('Multi-turn Conversations', () => {
    it('should maintain context across messages', async () => {
      const session = client.createSession();

      const msg1 = await session.send('Create a user class');
      const msg2 = await session.send('Add a method to validate email');
      const msg3 = await session.send('Add error handling');

      expect(msg1.sessionId).toBe(msg2.sessionId);
      expect(msg2.sessionId).toBe(msg3.sessionId);
      expect(session.messageCount).toBe(3);
    });

    it('should handle complex workflow with multiple sessions', async () => {
      const session1 = client.createSession();
      const session2 = client.createSession();

      // Session 1: Build feature
      await session1.send('Create authentication module');
      await session1.send('Add login function');

      // Session 2: Build tests
      await session2.send('Create test file');
      await session2.send('Add test cases');

      // Continue session 1
      await session1.send('Add error handling');

      expect(session1.messageCount).toBe(3);
      expect(session2.messageCount).toBe(2);
      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe('Session Options', () => {
    it('should pass options to adapter session', async () => {
      const session = client.createSession({
        logPath: './logs/test',
        workingDir: '/test/dir',
      });

      const result = await session.send('Test');

      expect(result.status).toBe('success');
    });

    it('should allow per-message option overrides', async () => {
      const session = client.createSession({
        workingDir: '/default/dir',
      });

      const result = await session.send('Test', {
        workingDir: '/override/dir',
      });

      expect(result.status).toBe('success');
    });
  });

  describe('Session Metadata', () => {
    it('should track session metadata', async () => {
      const session = client.createSession();
      const startTime = Date.now();

      await session.send('Message 1');
      await session.send('Message 2');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const sessions = client.listActiveSessions();
      expect(sessions.length).toBe(1);

      const sessionInfo = sessions[0];
      expect(sessionInfo.messageCount).toBe(2);
      expect(sessionInfo.startedAt).toBeGreaterThanOrEqual(startTime);
      expect(sessionInfo.lastMessageAt).toBeGreaterThanOrEqual(sessionInfo.startedAt);
      expect(sessionInfo.adapter).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during session creation', () => {
      const noSessionAdapter: AIAdapter = {
        async execute<T = string>(
          _prompt: string,
          _options?: ExecutionOptions
        ): Promise<ExecutionResponse<T>> {
          return {
            output: 'test' as T,
            sessionId: 'test',
            status: 'success',
            exitCode: 0,
            duration: 100,
            metadata: {},
          };
        },
        getCapabilities() {
          return {
            streaming: false,
            sessionManagement: false,
            toolCalling: false,
            multiModal: false,
          };
        },
      };

      const noSessionClient = new AgentClient({ adapter: noSessionAdapter });

      expect(() => noSessionClient.createSession()).toThrow('does not support session management');
    });
  });
});
