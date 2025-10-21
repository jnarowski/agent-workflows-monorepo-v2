/**
 * Unified session class that wraps adapter-specific sessions
 */

import { EventEmitter } from 'node:events';
import type {
  AIAdapter,
  ExecutionResponse,
  SessionOptions,
  SendOptions,
  AdapterSession,
} from '../types';

/**
 * Unified session wrapper
 */
export class Session extends EventEmitter {
  // private adapter: AIAdapter;
  private adapterSession: AdapterSession; // Adapter-specific session (e.g., ClaudeSession)
  private options: SessionOptions;
  private _sessionId?: string;
  private _messageCount = 0;
  readonly startedAt: number;
  lastMessageAt?: number;

  constructor(
    _adapter: AIAdapter,
    adapterSession: AdapterSession,
    options: SessionOptions
  ) {
    super();
    // this.adapter = _adapter;
    this.adapterSession = adapterSession;
    this.options = options;
    this.startedAt = Date.now();

    // Pre-set session ID if provided
    if (options.sessionId) {
      this._sessionId = options.sessionId;
    }

    // Forward events from adapter session
    this.setupEventForwarding();
  }

  /**
   * Send a message in this session
   */
  async send<T = string>(
    message: string,
    options: SendOptions = {}
  ): Promise<ExecutionResponse<T>> {
    console.log('[agent-cli-sdk Session] send() called:', {
      sessionId: this._sessionId,
      messageLength: message.length,
      messagePreview: message.substring(0, 100),
      options: JSON.stringify(options),
    });

    const mergedOptions = {
      ...this.options,
      ...options,
    };

    console.log('[agent-cli-sdk Session] Calling adapterSession.send()');

    // Delegate to adapter session
    const result = await this.adapterSession.send<T>(message, mergedOptions);

    console.log('[agent-cli-sdk Session] Received result from adapterSession:', {
      sessionId: result.sessionId,
      resultType: typeof result,
      hasOutput: !!result.output,
    });

    // Update metadata
    this._messageCount++;
    this.lastMessageAt = Date.now();

    // Capture session ID from first message
    if (!this._sessionId && result.sessionId) {
      this._sessionId = result.sessionId;
    }

    return result;
  }

  /**
   * Abort the session - prevents new messages from being sent
   *
   * IMPORTANT: This does NOT terminate in-flight executions.
   * It only prevents new calls to send() from succeeding.
   * Any ongoing execution will complete normally.
   */
  abort(): void {
    if (this.adapterSession.abort) {
      this.adapterSession.abort();
      // Don't emit 'aborted' here - it will be forwarded from the adapter session
      // to avoid duplicate events
    }
  }

  /**
   * Get session ID (undefined until first message completes)
   */
  getSessionId(): string | undefined {
    return this._sessionId;
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this._messageCount;
  }

  /**
   * Getter for session ID
   */
  get sessionId(): string | undefined {
    return this._sessionId;
  }

  /**
   * Getter for message count
   */
  get messageCount(): number {
    return this._messageCount;
  }

  /**
   * Setup event forwarding from adapter session
   */
  private setupEventForwarding(): void {
    // Forward all events from adapter session
    const eventTypes = ['output', 'event', 'complete', 'error', 'aborted'];

    for (const eventType of eventTypes) {
      this.adapterSession.on(eventType, (...args: unknown[]) => {
        this.emit(eventType, ...args);
      });
    }
  }
}
