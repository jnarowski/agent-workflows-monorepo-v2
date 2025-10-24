/**
 * Claude multi-turn session implementation
 */

import { EventEmitter } from 'node:events';
import type { ExecutionResponse, SessionOptions, SendOptions, ClaudeExecutionOptions } from '../../types/index.js';
import type { ClaudeAdapter } from './index';
import { createSessionMessageLogPath } from '../../utils/index.js';

/**
 * Claude session for multi-turn conversations
 */
export class ClaudeSession extends EventEmitter {
  private adapter: ClaudeAdapter;
  private options: SessionOptions;
  private _sessionId?: string;
  private _messageCount = 0;
  private _aborted = false;
  readonly startedAt: number;
  lastMessageAt?: number;

  constructor(adapter: ClaudeAdapter, options: SessionOptions = {}) {
    super();
    this.adapter = adapter;
    this.options = options;
    this.startedAt = Date.now();

    // Pre-set session ID if provided
    if (options.sessionId) {
      this._sessionId = options.sessionId;
    }
  }

  /**
   * Send a message in this session
   */
  async send<T = string>(message: string, options: SendOptions = {}): Promise<ExecutionResponse<T>> {
    console.log('[agent-cli-sdk ClaudeSession] send() called:', {
      sessionId: this._sessionId,
      messageCount: this._messageCount,
      messageLength: message.length,
      aborted: this._aborted,
    });

    if (this._aborted) {
      throw new Error('Cannot send message: session has been aborted');
    }

    // Increment message count
    this._messageCount++;

    // Merge session options with message options
    const mergedOptions: ClaudeExecutionOptions = {
      ...this.options,
      ...options,
    };

    // Session management:
    // - First message: pass sessionId to create with that ID (if pre-set), otherwise let CLI generate
    // - Subsequent messages: pass sessionId + resume to continue
    if (this._messageCount > 1 && this._sessionId) {
      mergedOptions.sessionId = this._sessionId;
      mergedOptions.resume = true;
    } else if (this._sessionId) {
      // First message with pre-set sessionId
      mergedOptions.sessionId = this._sessionId;
    }

    console.log('[agent-cli-sdk ClaudeSession] Session config:', {
      messageCount: this._messageCount,
      sessionId: this._sessionId,
      resume: mergedOptions.resume,
      hasOnOutput: !!this.options.onOutput,
      hasOnEvent: !!this.options.onEvent,
    });

    // Create message-specific log path if session logging is enabled
    if (this.options.logPath && !options.logPath) {
      mergedOptions.logPath = createSessionMessageLogPath(this.options.logPath, this._messageCount);
    }

    // Set up callbacks
    if (this.options.onOutput || this.options.onEvent) {
      mergedOptions.onOutput = (data: import('../../types/index.js').OutputData) => {
        console.log('[agent-cli-sdk ClaudeSession] onOutput callback triggered:', data);
        this.emit('output', data);
        this.options.onOutput?.(data);
      };

      mergedOptions.onEvent = (event: import('../../types/index.js').StreamEvent) => {
        console.log('[agent-cli-sdk ClaudeSession] onEvent callback triggered:', event.type);
        this.emit('event', event);
        this.options.onEvent?.(event);
      };
    }

    try {
      console.log('[agent-cli-sdk ClaudeSession] Calling adapter.execute()');
      // Execute via adapter
      const result = await this.adapter.execute<T>(message, mergedOptions);

      console.log('[agent-cli-sdk ClaudeSession] adapter.execute() completed:', {
        sessionId: result.sessionId,
        hasOutput: !!result.data,
      });

      // Capture session ID from first message
      if (!this._sessionId && result.sessionId) {
        this._sessionId = result.sessionId;
      }

      // Update last message time
      this.lastMessageAt = Date.now();

      // Emit complete event
      this.emit('complete', result);

      return result;
    } catch (error) {
      console.error('[agent-cli-sdk ClaudeSession] Error in adapter.execute():', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Abort the session - prevents new messages from being sent
   *
   * IMPORTANT: Due to the spawn-per-message model, this does NOT terminate
   * in-flight executions. It only prevents new calls to send() from succeeding.
   * Any ongoing execution will complete normally.
   *
   * To check if a session is aborted, use isAborted()
   */
  abort(): void {
    this._aborted = true;
    this.emit('aborted');
    // Note: We can't abort ongoing execution in spawn-per-message model
    // This just prevents new messages from being sent
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
   * Check if session is aborted
   */
  isAborted(): boolean {
    return this._aborted;
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
}
