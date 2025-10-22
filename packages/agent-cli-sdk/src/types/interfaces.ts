/**
 * Core interfaces for the agent-cli-sdk
 */

/**
 * Stream event emitted during CLI execution
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
 * Adapter capabilities
 */
export interface AdapterCapabilities {
  streaming: boolean;
  sessionManagement: boolean;
  toolCalling: boolean;
  multiModal: boolean;
}

/**
 * Standard execution response
 * @template T Output type (string or structured data)
 */
export interface ExecutionResponse<T = string> {
  output: T;
  data?: StreamEvent[];
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

/**
 * Core interface that all adapters must implement
 */
export interface AIAdapter {
  /**
   * Execute a prompt
   * @template T The expected output type (inferred from responseSchema)
   */
  execute<T = string>(
    prompt: string,
    options?: ExecutionOptions
  ): Promise<ExecutionResponse<T>>;

  /**
   * Get adapter capabilities
   */
  getCapabilities(): AdapterCapabilities;

  /**
   * Create a multi-turn session (optional - not all adapters support this)
   */
  createSession?(options?: unknown): unknown;
}
