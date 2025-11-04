/**
 * Unified API Error Types
 *
 * Shared between frontend and backend to ensure consistent error handling.
 * Backend generates these types, frontend consumes them.
 */

/**
 * Standard API error response format
 *
 * @example
 * {
 *   error: {
 *     message: "Project not found",
 *     statusCode: 404,
 *     code: "NOT_FOUND"
 *   }
 * }
 */
export interface ApiErrorResponse {
  error: {
    /** Human-readable error message */
    message: string;
    /** HTTP status code */
    statusCode: number;
    /** Optional machine-readable error code for client-side handling */
    code?: string;
    /** Optional additional error details (e.g., validation errors) */
    details?: unknown;
  };
}

/**
 * Custom Error class for API errors
 *
 * Extends Error with statusCode, code, and details properties
 * for consistent error handling across the application.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, ApiError);
  }
}
