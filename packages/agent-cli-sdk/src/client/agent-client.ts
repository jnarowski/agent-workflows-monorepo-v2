/**
 * Main AgentClient orchestration layer
 */

import type {
  AIAdapter,
  AdapterCapabilities,
  ExecutionResponse,
  AgentClientOptions,
  AgentClientConfig,
  ExecuteOptions,
  SessionOptions,
  SessionInfo,
  AdapterSession,
} from '../types';
import { Session } from './session';
import { ValidationError } from '../core/errors';

/**
 * Main client for orchestrating AI CLI adapters
 */
export class AgentClient {
  private adapter: AIAdapter;
  private activeSessions = new Map<string, Session>();
  private config: AgentClientConfig;

  constructor(options: AgentClientOptions) {
    // Only accept adapter instances
    if (typeof options.adapter === 'string') {
      throw new ValidationError(
        `String-based adapter creation is not supported. Use createClaudeAdapter() or createCodexAdapter() to create an adapter instance:\n\n` +
        `  import { createClaudeAdapter } from '@sourceborn/agent-cli-sdk-three';\n` +
        `  const adapter = createClaudeAdapter();\n` +
        `  const client = new AgentClient({ adapter });`
      );
    }

    this.adapter = options.adapter;

    console.log('[AgentClient] Constructor called with options.workingDir:', options.workingDir);

    this.config = {
      workingDir: options.workingDir,
      verbose: options.verbose,
      logPath: options.logPath,
    };

    console.log('[AgentClient] Config set with workingDir:', this.config.workingDir);
  }

  /**
   * Execute a single prompt (programmatic mode)
   */
  async execute<T = string>(
    prompt: string,
    options: ExecuteOptions = {}
  ): Promise<ExecutionResponse<T>> {
    // Merge client config with execution options
    const mergedOptions = {
      workingDir: this.config.workingDir,
      verbose: this.config.verbose,
      logPath: this.config.logPath,
      ...options,
    };

    console.log('[AgentClient.execute] mergedOptions.workingDir:', mergedOptions.workingDir);

    // Set up streaming if callbacks are provided
    if (options.onOutput || options.onEvent) {
      mergedOptions.streaming = true;
    }

    // Delegate to adapter
    return this.adapter.execute<T>(prompt, mergedOptions);
  }

  /**
   * Create a multi-turn conversation session
   */
  createSession(options: SessionOptions = {}): Session {
    // Merge client config with session options
    const mergedOptions = {
      workingDir: this.config.workingDir,
      verbose: this.config.verbose,
      logPath: this.config.logPath,
      ...options,
    };

    // Create session using adapter
    if (!this.adapter.createSession) {
      throw new ValidationError('Adapter does not support session management');
    }

    const adapterSession = this.adapter.createSession(mergedOptions) as AdapterSession;

    // Wrap in unified Session class
    const session = new Session(this.adapter, adapterSession, mergedOptions);

    // Track session after first message
    session.once('complete', (result: ExecutionResponse) => {
      if (result.sessionId) {
        this.activeSessions.set(result.sessionId, session);
      }
    });

    // Cleanup on error
    session.once('error', () => {
      const sessionId = session.getSessionId();
      if (sessionId) {
        this.activeSessions.delete(sessionId);
      }
    });

    return session;
  }

  /**
   * Get active session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Abort a specific session by ID
   */
  abortSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.abort();
      this.activeSessions.delete(sessionId);
      return true;
    }
    return false;
  }

  /**
   * List all active sessions
   */
  listActiveSessions(): SessionInfo[] {
    return Array.from(this.activeSessions.values()).map((session) => ({
      sessionId: session.getSessionId() || 'pending',
      messageCount: session.getMessageCount(),
      startedAt: session.startedAt,
      lastMessageAt: session.lastMessageAt,
      adapter: this.adapter.constructor.name,
    }));
  }

  /**
   * Get the underlying adapter
   */
  getAdapter(): AIAdapter {
    return this.adapter;
  }

  /**
   * Get adapter capabilities
   */
  getCapabilities(): AdapterCapabilities {
    return this.adapter.getCapabilities();
  }

}
