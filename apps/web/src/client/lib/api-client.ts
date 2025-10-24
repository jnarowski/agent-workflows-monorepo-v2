/**
 * Centralized API client with automatic auth header injection and global 401 handling
 */

import { getAuthToken } from '@/client/lib/auth';
import { useAuthStore } from '@/client/stores/authStore';
import { ApiError, type ApiErrorResponse } from '@/client/lib/api-types';
import type { SessionMessage } from "@/shared/types/chat";

/**
 * Request options for API calls
 */
export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Centralized API client class
 * Handles authentication headers, 401 errors, and provides type-safe HTTP methods
 */
class ApiClient {
  /**
   * Private request method with interceptor logic
   * - Auto-injects Authorization header from auth store
   * - Sets Content-Type: application/json by default
   * - Handles 401 errors globally (logout + redirect to /login)
   * - Parses error responses for non-2xx status codes
   */
  private async _request<T>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const token = getAuthToken();

    // Build headers with auth token injection
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    // Build request options
    const requestOptions: RequestInit = {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    // Make the request
    const response = await fetch(url, requestOptions);

    // Response interceptor - handle 401 globally
    if (response.status === 401) {
      // Clear auth state and show error message
      useAuthStore.getState().handleInvalidToken();

      // Redirect to login
      window.location.href = '/login';

      throw new ApiError('Session expired', 401);
    }

    // Handle other error responses
    if (!response.ok) {
      // Try to parse error message from response
      const error = await response.json().catch(() => ({
        error: { message: `HTTP ${response.status}: ${response.statusText}` },
      })) as ApiErrorResponse;

      const errorMessage =
        typeof error.error === 'string'
          ? error.error
          : error.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      throw new ApiError(errorMessage, response.status, error);
    }

    // Parse successful response
    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this._request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * GET request that returns a Blob (for images, files, etc.)
   */
  async getBlob(url: string, options?: ApiRequestOptions): Promise<Blob> {
    const token = getAuthToken();

    // Build headers with auth token injection (no Content-Type for blob requests)
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    };

    // Make the request
    const response = await fetch(url, {
      ...options,
      method: 'GET',
      headers,
    });

    // Response interceptor - handle 401 globally
    if (response.status === 401) {
      useAuthStore.getState().handleInvalidToken();
      window.location.href = '/login';
      throw new ApiError('Session expired', 401);
    }

    // Handle other error responses
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    // Return blob
    return response.blob();
  }

  /**
   * POST request
   */
  async post<T>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this._request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this._request<T>(url, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this._request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this._request<T>(url, { ...options, method: 'PATCH', body });
  }

  /**
   * Generic request method (escape hatch for edge cases)
   */
  async request<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this._request<T>(url, options);
  }
}

/**
 * Singleton API client instance
 */
export const api = new ApiClient();

/**
 * Fetch historical messages for a session from JSONL file
 * @param projectId - The project ID
 * @param sessionId - The session ID
 * @returns Array of chat messages
 */
export async function getSessionMessages(
  projectId: string,
  sessionId: string
): Promise<SessionMessage[]> {
  try {
    const response = await api.get<{ data: SessionMessage[] }>(
      `/api/projects/${projectId}/sessions/${sessionId}/messages`
    );
    return response.data || [];
  } catch (error) {
    // If 404, return empty array (no JSONL file exists yet)
    if (error instanceof Error && error.message.includes('404')) {
      return [];
    }
    throw error;
  }
}
