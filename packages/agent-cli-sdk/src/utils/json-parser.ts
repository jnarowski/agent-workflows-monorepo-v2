/**
 * JSON parsing utilities
 */

import { ParseError } from '../core/errors';

/**
 * Extract JSON from text (handles markdown code blocks)
 */
export function extractJSON(text: string): unknown {
  if (!text || typeof text !== 'string') {
    throw new ParseError('Invalid input: expected non-empty string');
  }

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Continue to extraction logic
  }

  // Try to extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (err) {
      throw new ParseError(
        `Failed to parse JSON from code block: ${err instanceof Error ? err.message : String(err)}`,
        text
      );
    }
  }

  // Try to find JSON object in text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      throw new ParseError(
        `Failed to parse extracted JSON: ${err instanceof Error ? err.message : String(err)}`,
        text
      );
    }
  }

  throw new ParseError('No valid JSON found in text', text);
}

/**
 * Parse JSONL (JSON Lines) format
 */
export function parseJSONL(text: string): unknown[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const results: unknown[] = [];

  for (const line of lines) {
    try {
      results.push(JSON.parse(line));
    } catch {
      // Skip invalid JSON lines
      continue;
    }
  }

  return results;
}

/**
 * Safely parse JSON with validation
 */
export function safeJSONParse<T>(
  text: string,
  validator?: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues?: Array<{ path: string[]; message: string }> } } }
): T {
  const parsed = extractJSON(text);

  if (!validator) {
    return parsed as T;
  }

  const result = validator.safeParse(parsed);
  if (!result.success) {
    // Extract Zod error details if available
    let errorMessage = 'JSON validation failed';
    if (result.error && 'issues' in result.error) {
      const issues = (result.error as Record<string, unknown>).issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const errorDetails = issues.map((issue: Record<string, unknown>) => {
          const path = Array.isArray(issue.path) && issue.path.length > 0 ? issue.path.join('.') : 'root';
          const message = typeof issue.message === 'string' ? issue.message : 'Unknown error';
          return `${path}: ${message}`;
        }).join(', ');
        errorMessage = `JSON validation failed: ${errorDetails}`;
      }
    }
    throw new ParseError(errorMessage, text);
  }

  return result.data as T;
}
