/**
 * Shared type definitions for agent-cli-sdk
 */

/**
 * Stream event emitted during CLI execution
 *
 * @remarks
 * This is a generic event type for backward compatibility.
 * For type-safe event handling, use adapter-specific types:
 * - `ClaudeStreamEvent` for Claude Code events
 * - `CodexStreamEvent` for Codex events
 */
export interface StreamEvent {
  type: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

/**
 * Enhanced output data provided to onOutput callback
 */
export interface OutputData {
  /** Raw stdout chunk */
  raw: string;
  /** Parsed JSONL events from this chunk */
  events?: StreamEvent[];
  /** Text content extracted from events */
  text?: string;
  /** All text accumulated so far in this execution */
  accumulated: string;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Model-specific usage information
 */
export interface ModelUsage extends TokenUsage {
  model: string;
  costUSD?: number;
}

/**
 * Action log entry
 */
export interface ActionLog {
  type: string;
  timestamp: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  success: boolean;
  errors?: string[];
}

/**
 * Standard execution response
 *
 * @template T Output type (string or structured data)
 *
 * @remarks
 * The `events` field contains raw event data. For type-safe event handling,
 * cast to adapter-specific types:
 * - `response.events as ClaudeStreamEvent[]` for Claude Code
 * - `response.events as CodexStreamEvent[]` for Codex
 */
export interface ExecutionResponse<T = string> {
  data: T;
  events?: StreamEvent[];
  sessionId: string;
  status: 'success' | 'error' | 'timeout';
  exitCode: number;
  duration: number;

  // Optional metadata
  actions?: ActionLog[];
  metadata: {
    model?: string;
    tokensUsed?: number;
    toolsUsed?: string[];
    filesModified?: string[];
    validation?: ValidationResult;
  };

  // Token usage details
  usage?: TokenUsage;
  modelUsage?: Record<string, ModelUsage>;
  totalCostUSD?: number;

  // Raw CLI output
  raw?: {
    stdout: string;
    stderr: string;
  };

  // Error details (if status is 'error')
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Common execution options
 */
export interface ExecutionOptions {
  streaming?: boolean;
  onStream?: (event: StreamEvent) => void;
  onEvent?: (event: StreamEvent) => void;
  onOutput?: (data: OutputData) => void;
  sessionId?: string;
  timeout?: number;
  verbose?: boolean;
  logPath?: string;
  responseSchema?: true | { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { message: string } } };
  workingDir?: string;

  // Allow adapter-specific options
  [key: string]: unknown;
}
