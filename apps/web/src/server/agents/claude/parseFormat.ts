import type { SessionMessage, ContentBlock } from '@/shared/types/message.types';

/**
 * Parse a single JSONL line into a SessionMessage
 * Handles Claude CLI format with 'type' field
 * @param jsonlLine - Single line from JSONL file
 * @returns SessionMessage or null if not a valid message
 */
export function parseFormat(jsonlLine: string): SessionMessage | null {
  try {
    const entry = JSON.parse(jsonlLine);

    // Extract role from 'type' field (Claude CLI format)
    const role = entry.type;

    // Only process user and assistant messages
    if (role !== 'user' && role !== 'assistant') {
      return null;
    }

    // Extract content from message.content (Claude CLI format)
    let content = entry.message?.content ?? entry.content;

    // Ensure content is an array of ContentBlocks
    if (typeof content === 'string') {
      content = [{ type: 'text', text: content }];
    } else if (!Array.isArray(content)) {
      content = [];
    }

    // Extract metadata (usage, model, etc.)
    const metadata: Record<string, unknown> = {};
    if (entry.usage) {
      metadata.usage = entry.usage;
    }
    if (entry.model) {
      metadata.model = entry.model;
    }

    return {
      id: entry.id || entry.uuid || `${entry.timestamp}-${role}`,
      role,
      content: content as ContentBlock[],
      timestamp: new Date(entry.timestamp || Date.now()).getTime(),
      metadata,
    };
  } catch (error) {
    // Skip malformed lines
    console.warn(`Failed to parse JSONL line: ${error}`);
    return null;
  }
}
