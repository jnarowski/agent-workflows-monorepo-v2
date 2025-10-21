/**
 * Logging-related types
 */

import type { ExecutionResponse } from './interfaces';

/**
 * Execution log entry
 */
export interface ExecutionLog {
  timestamp: number;
  input: {
    prompt: string;
    options: Record<string, unknown>;
  };
  output?: ExecutionResponse;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Log file paths
 */
export interface LogPaths {
  base: string;
  input: string;
  output: string;
  error: string;
}
