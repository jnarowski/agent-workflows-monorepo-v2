/**
 * Parse JSONL session data into SessionMessage array
 * Supports multiple formats via adapter system
 */

import type { SessionMessage } from "@/shared/types/chat";
import {
  parseJSONLWithAdapter,
  extractToolResultsWithAdapter,
} from "./sessionAdapters";

/**
 * Parse JSONL content into an array of SessionMessage objects
 * Uses adapter system to handle Claude Code JSONL format
 *
 * Note: Claude Code JSONL files contain complete, finalized messages.
 * Streaming events (message_start, content_block_delta, etc.) only occur
 * during real-time WebSocket streaming and are never written to JSONL files.
 *
 * @param jsonlContent - Raw JSONL string content
 * @returns Array of parsed SessionMessage objects
 */
export function parseJSONLSession(jsonlContent: string): SessionMessage[] {
  // Use adapter-based parsing (handles Claude Code JSONL format)
  return parseJSONLWithAdapter(jsonlContent);
}

/**
 * Extract tool results from JSONL and create a lookup map
 * Auto-detects format and uses appropriate extraction method
 * @param jsonlContent - Raw JSONL string content
 * @returns Map of tool_use_id to tool result
 */
export function extractToolResults(
  jsonlContent: string
): Map<string, { content: string; is_error?: boolean }> {
  // Use adapter-based extraction (handles both CLI and streaming formats)
  return extractToolResultsWithAdapter(jsonlContent);
}
