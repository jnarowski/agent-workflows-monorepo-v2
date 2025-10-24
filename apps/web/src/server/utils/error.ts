/**
 * Error Utilities
 *
 * Custom error classes and response builders for consistent error handling
 * throughout the Fastify application.
 */

/**
 * Base class for custom HTTP errors with status codes
 */
abstract class HTTPError extends Error {
  abstract statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends HTTPError {
  statusCode = 404;

  constructor(message = 'Resource not found') {
    super(message);
  }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthorizedError extends HTTPError {
  statusCode = 401;

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

/**
 * 403 Forbidden Error
 */
export class ForbiddenError extends HTTPError {
  statusCode = 403;

  constructor(message = 'Forbidden') {
    super(message);
  }
}

/**
 * 400 Validation Error
 */
export class ValidationError extends HTTPError {
  statusCode = 400;

  constructor(message = 'Validation failed') {
    super(message);
  }
}

/**
 * Error Response Structure
 */
export interface ErrorResponse {
  error: {
    message: string;
    statusCode: number;
    code?: string;
  };
}

/**
 * Build a standardized error response
 *
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @param code - Optional error code for client-side handling
 * @returns Standardized error response object
 */
export function buildErrorResponse(
  statusCode: number,
  message: string,
  code?: string,
): ErrorResponse {
  return {
    error: {
      message,
      statusCode,
      ...(code && { code }),
    },
  };
}
