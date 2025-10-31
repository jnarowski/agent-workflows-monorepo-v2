/**
 * Error Utilities
 *
 * Custom error classes and response builders for consistent error handling
 * throughout the Fastify application.
 *
 * This file re-exports the new error classes from the errors/ directory
 * and maintains backward compatibility with existing code.
 */

// Re-export new error classes
export { AppError } from '@/server/errors/AppError.js';
export { ConflictError } from '@/server/errors/ConflictError.js';
export { BadRequestError } from '@/server/errors/BadRequestError.js';
export { InternalServerError } from '@/server/errors/InternalServerError.js';
export { ServiceUnavailableError } from '@/server/errors/ServiceUnavailableError.js';

// Backward compatibility: Keep existing error classes
import { AppError } from '@/server/errors/AppError.js';

/**
 * 404 Not Found Error
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(message = 'Resource not found', context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized', context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * 403 Forbidden Error
 */
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';

  constructor(message = 'Forbidden', context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * 400 Validation Error
 * @deprecated Use BadRequestError from errors/ directory for new code
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(message = 'Validation failed', context?: Record<string, unknown>) {
    super(message, context);
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
