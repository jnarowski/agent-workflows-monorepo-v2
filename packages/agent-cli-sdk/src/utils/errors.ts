/**
 * Custom error classes for agent-cli-sdk
 */

/**
 * Base error class for all SDK errors
 */
export class AgentSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentSDKError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends AgentSDKError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * CLI not found error - thrown when CLI binary cannot be located
 */
export class CLINotFoundError extends AgentSDKError {
  public readonly cliName: string;

  constructor(cliName: string, message?: string) {
    super(
      message ||
        `${cliName} CLI not found. Please install it or set the appropriate environment variable.`
    );
    this.name = 'CLINotFoundError';
    this.cliName = cliName;
  }
}

/**
 * Authentication error - thrown when authentication fails
 */
export class AuthenticationError extends AgentSDKError {
  public readonly cliName: string;

  constructor(cliName: string, message?: string) {
    super(
      message ||
        `Authentication failed for ${cliName}. Please check your credentials.`
    );
    this.name = 'AuthenticationError';
    this.cliName = cliName;
  }
}

/**
 * Execution error - thrown when CLI execution fails
 */
export class ExecutionError extends AgentSDKError {
  public readonly exitCode?: number;
  public readonly stderr?: string;

  constructor(message: string, exitCode?: number, stderr?: string) {
    super(message);
    this.name = 'ExecutionError';
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/**
 * Timeout error - thrown when execution exceeds timeout
 */
export class TimeoutError extends AgentSDKError {
  public readonly timeoutMs: number;

  constructor(timeoutMs: number, message?: string) {
    super(message || `Execution exceeded timeout of ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Parse error - thrown when output parsing fails
 */
export class ParseError extends AgentSDKError {
  public readonly raw?: string;

  constructor(message: string, raw?: string) {
    super(message);
    this.name = 'ParseError';
    this.raw = raw;
  }
}

/**
 * Session error - thrown when session operations fail
 */
export class SessionError extends AgentSDKError {
  public readonly sessionId?: string;

  constructor(message: string, sessionId?: string) {
    super(message);
    this.name = 'SessionError';
    this.sessionId = sessionId;
  }
}
