import type { ExecutionResponse } from '../types/workflow.js';

/**
 * Extracts valid JSON from an ExecutionResponse that may contain mixed text and JSON
 *
 * This function handles several scenarios:
 * 1. If response.output is already an object (parsed via responseSchema), returns it directly
 * 2. If response.output is a string containing JSON in markdown code blocks (```json or ```), extracts it
 * 3. If response.output is a string containing raw JSON objects/arrays, extracts them
 * 4. Otherwise returns null
 *
 * Note: When using responseSchema in the SDK, the output field will already be parsed as type T.
 * This function is mainly useful for responses without responseSchema where output is a string.
 *
 * @param response - The CLI response to parse
 * @returns The parsed JSON object, or null if no valid JSON found
 *
 * @example
 * // Response with responseSchema (output already parsed)
 * const response = { status: 'success', output: { success: true } };
 * parseJsonResponse(response); // { success: true }
 *
 * @example
 * // Response with JSON in markdown block
 * const response = {
 *   status: 'success',
 *   output: 'Here is the result:\n```json\n{"success": true}\n```'
 * };
 * parseJsonResponse(response); // { success: true }
 *
 * @example
 * // Response with mixed text and JSON
 * const response = {
 *   status: 'success',
 *   output: 'Analysis complete.\n\n{"success": true, "count": 5}\n\nDone!'
 * };
 * parseJsonResponse(response); // { success: true, count: 5 }
 */
export function parseJsonResponse<T = unknown>(
  response: ExecutionResponse<T | string>
): T | null {
  // If output is already an object (parsed via responseSchema), return it
  if (typeof response.output === 'object' && response.output !== null) {
    return response.output as T;
  }

  // If output is not a string, return null
  if (typeof response.output !== 'string') {
    return null;
  }

  const output = response.output;

  // Try to extract JSON from markdown code blocks (```json or ```)
  const codeBlockMatch = output.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {
      // If code block content isn't valid JSON, continue to next strategy
    }
  }

  // Try to find JSON object or array in the output
  // Look for standalone { or [ and try to parse from that position
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as T;
        // Return the first valid JSON found
        return parsed;
      } catch {
        // Try next line
        continue;
      }
    }
  }

  // Try to parse the entire output as JSON (in case it's pure JSON)
  try {
    return JSON.parse(output.trim()) as T;
  } catch {
    // Not valid JSON
  }

  // No valid JSON found
  return null;
}

/**
 * Extracts valid JSON from an ExecutionResponse, throwing if no valid JSON found
 *
 * This is a stricter version of parseJsonResponse that throws an error
 * instead of returning null when no valid JSON is found.
 *
 * @param response - The CLI response to parse
 * @returns The parsed JSON object
 * @throws Error if no valid JSON found in response
 *
 * @example
 * const response = { status: 'success', output: { success: true } };
 * parseJsonResponseStrict(response); // { success: true }
 *
 * @example
 * const response = { status: 'success', output: 'No JSON here' };
 * parseJsonResponseStrict(response); // throws Error
 */
export function parseJsonResponseStrict<T = unknown>(
  response: ExecutionResponse<T | string>
): T {
  const result = parseJsonResponse<T>(response);

  if (result === null) {
    const outputType = typeof response.output;
    const outputLength = typeof response.output === 'string' ? response.output.length : 0;
    throw new Error(
      'No valid JSON found in CLI response. ' +
        `Response status: ${response.status}, ` +
        `Output type: ${outputType}, ` +
        `Output length: ${outputLength}`
    );
  }

  return result;
}
