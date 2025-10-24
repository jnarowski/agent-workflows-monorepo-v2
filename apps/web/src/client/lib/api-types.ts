/**
 * Shared API error response types
 */

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  } | string;
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
