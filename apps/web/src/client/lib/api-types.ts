/**
 * Client-side API error response types
 *
 * **Note**: These types should align with the backend ErrorResponse type
 * defined in `@/server/utils/error.ts`. Currently there are some differences:
 *
 * - Backend includes `statusCode` field, frontend doesn't
 * - Frontend allows `error` to be string OR object (legacy handling)
 * - Frontend has optional `details` field
 *
 * Backend format:
 * ```typescript
 * {
 *   error: {
 *     message: string;
 *     statusCode: number;
 *     code?: string;
 *   }
 * }
 * ```
 *
 * Future improvement: Reconcile these types by moving to shared/types/api.types.ts
 */

/**
 * Standard API error response structure
 *
 * Supports both the standard object format and legacy string format.
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
