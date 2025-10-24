/**
 * Router for content block renderers
 * Dispatches to appropriate renderer based on block type
 */

import type { ContentBlock } from "@/shared/types/message.types";
import { TextBlock } from "./TextBlock";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolUseBlock } from "./ToolUseBlock";

interface ContentBlockRendererProps {
  block: ContentBlock;
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
  className?: string;
}

export function ContentBlockRenderer({
  block,
  toolResults,
  className = "",
}: ContentBlockRendererProps) {
  switch (block.type) {
    case "text":
      return <TextBlock text={block.text} className={className} />;

    case "thinking":
      return <ThinkingBlock thinking={block.thinking} className={className} />;

    case "tool_use": {
      // Look up the result for this tool use
      const result = toolResults?.get(block.id);
      return (
        <ToolUseBlock
          id={block.id}
          name={block.name}
          input={block.input}
          result={result}
          className={className}
        />
      );
    }

    case "tool_result":
      // Tool results are handled inline with tool_use blocks
      // We don't render them separately
      return null;

    case "result":
      // Result blocks from streaming - don't render separately
      // These are intermediate streaming events
      return null;

    default: {
      // Unknown block type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn("Unknown content block type:", (block as any).type);
      return (
        <div className="text-sm text-muted-foreground italic">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          Unknown content block type: {(block as any).type}
        </div>
      );
    }
  }
}
