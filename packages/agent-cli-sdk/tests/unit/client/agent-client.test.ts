/**
 * Tests for AgentClient
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentClient } from '../../../src/client/agent-client';
import type { AIAdapter, ExecutionResponse, AdapterCapabilities } from '../../../src/types/index';

// Mock adapter for testing
class MockAdapter implements AIAdapter {
  async execute<T = string>(prompt: string): Promise<ExecutionResponse<T>> {
    return {
      data: `Mock response to: ${prompt}` as T,
      sessionId: 'mock-session-123',
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
      toolCalling: false,
      multiModal: false,
    };
  }

  private sessionCounter = 0;

  createSession() {
    const listeners = new Map<string, Function[]>();
    const sessionId = `mock-session-${++this.sessionCounter}`;

    return {
      send: async (message: string) => {
        const result = {
          data: `Mock session response to: ${message}`,
          sessionId,
          status: 'success' as const,
          exitCode: 0,
          duration: 50,
          metadata: {},
        };

        // Emit complete event
        const completeListeners = listeners.get('complete') || [];
        completeListeners.forEach(fn => fn(result));

        return result;
      },
      getSessionId: () => sessionId,
      getMessageCount: () => 1,
      abort: () => {},
      on: (event: string, fn: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(fn);
      },
      once: (event: string, fn: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(fn);
      },
    };
  }
}

describe('AgentClient', () => {
  let client: AgentClient;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    client = new AgentClient({ adapter: mockAdapter });
  });

  describe('execute', () => {
    it('should execute a prompt successfully', async () => {
      const result = await client.execute('Test prompt');

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.data).toContain('Test prompt');
      expect(result.sessionId).toBe('mock-session-123');
    });

    it('should merge client config with execution options', async () => {
      const clientWithConfig = new AgentClient({
        adapter: mockAdapter,
        workingDir: '/test/dir',
        verbose: true,
      });

      const result = await clientWithConfig.execute('Test');
      expect(result).toBeDefined();
    });
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const session = client.createSession();

      expect(session).toBeDefined();
      expect(typeof session.send).toBe('function');
      expect(typeof session.abort).toBe('function');
    });

    it('should track active sessions after first message', async () => {
      const session = client.createSession();
      await session.send('Test message');

      const activeSessions = client.listActiveSessions();
      expect(activeSessions.length).toBeGreaterThan(0);
    });
  });

  describe('getCapabilities', () => {
    it('should return adapter capabilities', () => {
      const capabilities = client.getCapabilities();

      expect(capabilities).toEqual({
        streaming: true,
        sessionManagement: true,
        toolCalling: false,
        multiModal: false,
      });
    });
  });

  describe('getAdapter', () => {
    it('should return the underlying adapter', () => {
      const adapter = client.getAdapter();
      expect(adapter).toBe(mockAdapter);
    });
  });

  describe('session management', () => {
    it('should abort a session by ID', async () => {
      const session = client.createSession();
      await session.send('Test');

      const sessionId = session.getSessionId();
      if (sessionId) {
        const aborted = client.abortSession(sessionId);
        expect(aborted).toBe(true);
      }
    });

    it('should return false when aborting non-existent session', () => {
      const aborted = client.abortSession('non-existent-id');
      expect(aborted).toBe(false);
    });

    it('should list all active sessions', async () => {
      const session1 = client.createSession();
      const session2 = client.createSession();

      await session1.send('Test 1');
      await session2.send('Test 2');

      const sessions = client.listActiveSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should include session metadata in list', async () => {
      const session = client.createSession();
      await session.send('Test');

      // Wait for session to be registered
      await new Promise((resolve) => setTimeout(resolve, 10));

      const sessions = client.listActiveSessions();
      expect(sessions.length).toBeGreaterThan(0);

      const sessionInfo = sessions[0];
      expect(sessionInfo.sessionId).toBeDefined();
      expect(sessionInfo.messageCount).toBeGreaterThan(0);
      expect(sessionInfo.startedAt).toBeGreaterThan(0);
      expect(sessionInfo.adapter).toBeDefined();
    });

    it('should get specific session by ID', async () => {
      const session = client.createSession();
      await session.send('Test');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const sessionId = session.getSessionId();
      const retrieved = client.getSession(sessionId!);

      expect(retrieved).toBe(session);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = client.getSession('does-not-exist');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should propagate adapter errors', async () => {
      const errorAdapter: AIAdapter = {
        async execute() {
          throw new Error('Adapter failed');
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

      const errorClient = new AgentClient({ adapter: errorAdapter });

      await expect(errorClient.execute('Test')).rejects.toThrow('Adapter failed');
    });

    it('should handle session creation without support', () => {
      const noSessionAdapter: AIAdapter = {
        async execute() {
          return {
            data: 'test',
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

  describe('Options Merging', () => {
    it('should use client-level options as defaults', async () => {
      const clientWithDefaults = new AgentClient({
        adapter: mockAdapter,
        workingDir: '/default/dir',
        verbose: true,
        timeout: 5000,
      });

      const result = await clientWithDefaults.execute('Test');
      expect(result).toBeDefined();
    });

    it('should allow execution-level options to override', async () => {
      const clientWithDefaults = new AgentClient({
        adapter: mockAdapter,
        timeout: 5000,
      });

      const result = await clientWithDefaults.execute('Test', {
        timeout: 10000,
      });

      expect(result).toBeDefined();
    });

    it('should merge nested options', async () => {
      const clientWithDefaults = new AgentClient({
        adapter: mockAdapter,
        workingDir: '/default',
        verbose: false,
      });

      const result = await clientWithDefaults.execute('Test', {
        verbose: true,
        timeout: 1000,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Concurrent Sessions', () => {
    it('should handle multiple concurrent sessions', async () => {
      const session1 = client.createSession();
      const session2 = client.createSession();
      const session3 = client.createSession();

      const results = await Promise.all([
        session1.send('Message 1'),
        session2.send('Message 2'),
        session3.send('Message 3'),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].data).toContain('Message 1');
      expect(results[1].data).toContain('Message 2');
      expect(results[2].data).toContain('Message 3');
    });

    it('should maintain separate session IDs for concurrent sessions', async () => {
      const session1 = client.createSession();
      const session2 = client.createSession();

      const [result1, result2] = await Promise.all([
        session1.send('Test 1'),
        session2.send('Test 2'),
      ]);

      expect(result1.sessionId).not.toBe(result2.sessionId);
    });
  });

  // Removed: Trivial configuration acceptance tests
  // These tests only verify that the constructor accepts parameters
  // and that objects are defined - they don't test actual behavior

  describe('Execution with Different Response Types', () => {
    it('should handle string output', async () => {
      const result = await client.execute('String test');

      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('String test');
    });

    it('should handle generic type parameter', async () => {
      interface CustomResponse {
        data: string;
        count: number;
      }

      // Mock adapter that returns structured data
      const structuredAdapter: AIAdapter = {
        async execute<T>(): Promise<ExecutionResponse<T>> {
          return {
            data: { data: 'test', count: 42 } as T,
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

      const structuredClient = new AgentClient({ adapter: structuredAdapter });
      const result = await structuredClient.execute<CustomResponse>('Test');

      expect(result.data).toHaveProperty('data');
      expect(result.data).toHaveProperty('count');
    });
  });

  describe('Session Lifecycle', () => {
    it('should track session from creation to completion', async () => {
      const session = client.createSession();

      expect(session.messageCount).toBe(0);
      expect(session.sessionId).toBeUndefined();

      await session.send('First message');

      expect(session.messageCount).toBe(1);
      expect(session.sessionId).toBeDefined();

      await session.send('Second message');

      expect(session.messageCount).toBe(2);
    });

    it('should maintain session state across multiple messages', async () => {
      const session = client.createSession();

      const result1 = await session.send('Message 1');
      const result2 = await session.send('Message 2');
      const result3 = await session.send('Message 3');

      expect(result1.sessionId).toBe(result2.sessionId);
      expect(result2.sessionId).toBe(result3.sessionId);
      expect(session.messageCount).toBe(3);
    });
  });
});
