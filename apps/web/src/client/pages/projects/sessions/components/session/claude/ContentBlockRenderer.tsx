/**
 * Router for content block renderers
 * Dispatches to appropriate renderer based on block type
 */

import type {
  UnifiedContent,
  EnrichedToolUseBlock,
} from "@/shared/types/message.types";
import { TextBlock } from "./TextBlock";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolBlockRenderer } from "./ToolBlockRenderer";
import { SlashCommandBlock } from "./blocks/SlashCommandBlock";

interface ContentBlockRendererProps {
  block: UnifiedContent;
  className?: string;
}

export function ContentBlockRenderer({
  block,
  className = "",
}: ContentBlockRendererProps) {
  // Enhanced logging with decision path
  if (import.meta.env.DEV) {
    const logData: Record<string, unknown> = {
      type: block.type
    };

    if (block.type === 'text') {
      logData.textLength = block.text?.length || 0;
      logData.isEmpty = !block.text || block.text.trim() === '';
    } else if (block.type === 'tool_use') {
      const enrichedBlock = block as EnrichedToolUseBlock;
      logData.toolName = block.name;
      logData.hasResult = Boolean(enrichedBlock.result);
    } else if (block.type === 'tool_result') {
      logData.willBeSkipped = true;
      logData.reason = 'Standalone tool_result blocks are filtered (nested in tool_use)';
    }

    console.log("[ContentBlockRenderer] Rendering block:", logData);
  }

  switch (block.type) {
    case "text": {
      // DEBUG: Check for empty text blocks
      if (import.meta.env.DEV && (!block.text || block.text.trim() === "")) {
        console.warn(
          "[ContentBlockRenderer] EMPTY TEXT BLOCK DETECTED:",
          block
        );

        return null;
      }

      return <TextBlock text={block.text} className={className} />;
    }

    case "thinking":
      return <ThinkingBlock thinking={block.thinking} className={className} />;

    case "tool_use": {
      // Access result directly from enriched block
      const enrichedBlock = block as EnrichedToolUseBlock;

      return (
        <ToolBlockRenderer
          toolName={block.name}
          input={block.input}
          result={enrichedBlock.result}
        />
      );
    }

    case "slash_command":
      return (
        <SlashCommandBlock
          command={block.command}
          message={block.message}
          args={block.args}
        />
      );

    case "tool_result":
      // Tool results are handled inline with tool_use blocks
      // We don't render them separately
      if (import.meta.env.DEV) {
        console.log(
          "[ContentBlockRenderer] Skipping standalone tool_result block"
        );
      }

      return null;

    default: {
      // Unknown block type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn("Unknown content block type:", (block as any).type, block);
      return (
        <div className="text-sm text-muted-foreground italic">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          Unknown content block type: {(block as any).type}
        </div>
      );
    }
  }
}
