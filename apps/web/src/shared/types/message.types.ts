/**
 * Message Types
 *
 * Re-exports SDK types as primary types with minimal UI extensions.
 * SDK types are the single source of truth for message structure.
 */

// Re-export SDK types as primary types
export type {
  UnifiedMessage,
  UnifiedContent,
  UnifiedTextBlock,
  UnifiedThinkingBlock,
  UnifiedToolUseBlock,
  UnifiedToolResultBlock,
  UnifiedSlashCommandBlock
} from '@repo/agent-cli-sdk';

// Single UI extension for streaming state
import type { UnifiedMessage, UnifiedToolUseBlock } from '@repo/agent-cli-sdk';

export type UIMessage = UnifiedMessage & {
  isStreaming?: boolean;
  _original?: UnifiedMessage; // Original message before enrichment (for debugging)
};

// Extended tool block with nested result
export type EnrichedToolUseBlock = UnifiedToolUseBlock & {
  result?: {
    content: string;
    is_error?: boolean;
  };
};
