/**
 * Sanitizes a workflow name to make it filesystem-safe.
 * Converts to lowercase, replaces non-alphanumeric with hyphens, and truncates to 50 chars.
 */
function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Workflow name must be a non-empty string');
  }

  // Convert to lowercase and replace non-alphanumeric with hyphens
  let sanitized = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Remove consecutive hyphens and trim leading/trailing hyphens
  sanitized = sanitized.replace(/-+/g, '-').replace(/^-+|-+$/g, '');

  if (!sanitized) {
    throw new Error('Workflow name must contain at least one alphanumeric character');
  }

  // Truncate to 50 characters
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50).replace(/-+$/, '');
  }

  return sanitized;
}

/**
 * Generates a human-readable workflow ID with timestamp and feature name.
 *
 * Format: YYYYMMDDHHMMSS-short-feature-name
 *
 * The timestamp is in UTC to ensure consistency across timezones.
 * The workflow name is automatically sanitized to be filesystem-safe.
 *
 * @param workflowName - The name or description of the workflow
 * @returns A workflow ID in format YYYYMMDDHHMMSS-feature-name
 *
 * @example
 * ```typescript
 * generateWorkflowId("User Authentication")
 * // Returns: "20251018143022-user-authentication"
 *
 * generateWorkflowId("API: Rate Limiting")
 * // Returns: "20251018143022-api-rate-limiting"
 * ```
 */
export function generateWorkflowId(workflowName: string): string {
  const now = new Date();

  // Format timestamp as YYYYMMDDHHMMSS (UTC)
  const year = now.getUTCFullYear().toString();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  const hour = now.getUTCHours().toString().padStart(2, '0');
  const minute = now.getUTCMinutes().toString().padStart(2, '0');
  const second = now.getUTCSeconds().toString().padStart(2, '0');

  const timestamp = `${year}${month}${day}${hour}${minute}${second}`;
  const sanitizedName = sanitizeName(workflowName);

  return `${timestamp}-${sanitizedName}`;
}
