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

    // Extract usage data as direct property (for token counting)
    // Usage can be at entry.usage OR entry.message.usage depending on format
    const usageData = entry.usage || entry.message?.usage;
    const usage = usageData ? {
      input_tokens: usageData.input_tokens,
      output_tokens: usageData.output_tokens,
      cache_creation_input_tokens: usageData.cache_creation_input_tokens,
      cache_read_input_tokens: usageData.cache_read_input_tokens,
    } : undefined;

    // Extract other metadata (model, etc.)
    const metadata: Record<string, unknown> = {};
    if (entry.model) {
      metadata.model = entry.model;
    }

    return {
      id: entry.id || entry.uuid || `${entry.timestamp}-${role}`,
      role,
      content: content as ContentBlock[],
      timestamp: new Date(entry.timestamp || Date.now()).getTime(),
      metadata,
      usage,
    };
  } catch (error) {
    // Skip malformed lines
    console.warn(`Failed to parse JSONL line: ${error}`);
    return null;
  }
}
