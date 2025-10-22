/**
 * Authentication utility functions
 * Provides access to auth state and authenticated fetch outside of React components
 */

import { useAuthStore } from '@/client/stores';

/**
 * Get the authentication token
 * Can be used in both React and non-React contexts
 *
 * @returns The JWT token or null if not authenticated
 *
 * @example
 * // In a utility function
 * const token = getAuthToken();
 * if (token) {
 *   // Make authenticated request
 * }
 *
 * @example
 * // In React components, prefer using the hook directly:
 * const token = useAuthStore((s) => s.token);
 */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

/**
 * Make an authenticated fetch request with automatic token injection
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, headers, etc.)
 * @param onUnauthorized - Optional callback for 401 errors (e.g., redirect to login)
 * @returns Parsed JSON response
 * @throws Error if the request fails or returns an error response
 *
 * @example
 * // Simple GET request
 * const data = await fetchWithAuth('/api/projects');
 *
 * @example
 * // POST request with body
 * const data = await fetchWithAuth('/api/projects', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'My Project' })
 * });
 *
 * @example
 * // With unauthorized handler
 * const data = await fetchWithAuth(
 *   '/api/projects',
 *   {},
 *   () => navigate('/login')
 * );
 */
export async function fetchWithAuth<T = any>(
  url: string,
  options: RequestInit = {},
  onUnauthorized?: () => void
): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - invalid or missing token
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
      throw new Error('Session expired');
    }

    // For other errors, try to parse error message from response
    const error = await response.json().catch(() => ({
      error: { message: `HTTP ${response.status}: ${response.statusText}` },
    }));
    const errorMessage =
      typeof error.error === 'string'
        ? error.error
        : error.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return response.json();
}
