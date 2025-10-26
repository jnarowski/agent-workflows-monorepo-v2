/**
 * Router for Codex content block renderers
 * Dispatches to appropriate renderer based on block type
 */

import type { ContentBlock } from '@/shared/types/message.types';
import { CodexTextBlock } from './CodexTextBlock';
import { CodexReasoningBlock } from './CodexReasoningBlock';
import { CodexFunctionCallBlock } from './CodexFunctionCallBlock';

interface ContentBlockRendererProps {
  block: ContentBlock;
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
  className?: string;
}

export function ContentBlockRenderer({
  block,
  toolResults,
  className = '',
}: ContentBlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <CodexTextBlock text={block.text} className={className} />;

    case 'thinking':
      return <CodexReasoningBlock thinking={block.thinking} className={className} />;

    case 'tool_use': {
      // Look up the result for this tool use
      const result = toolResults?.get(block.id);
      return (
        <CodexFunctionCallBlock
          toolName={block.name}
          toolId={block.id}
          input={block.input}
          result={result}
        />
      );
    }

    case 'tool_result':
      // Tool results are handled inline with tool_use blocks
      return null;

    default: {
      // Unknown block type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn('Unknown content block type:', (block as any).type);
      return (
        <div className="text-sm text-muted-foreground italic">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          Unknown content block type: {(block as any).type}
        </div>
      );
    }
  }
}
