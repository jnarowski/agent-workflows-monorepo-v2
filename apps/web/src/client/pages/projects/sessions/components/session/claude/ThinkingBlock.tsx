/**
 * Thinking/reasoning block
 * Collapsible display of Claude's internal reasoning
 */

import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { ToolDot } from "./components/ToolDot";

interface ThinkingBlockProps {
  thinking: string;
  className?: string;
}

export function ThinkingBlock({ thinking, className = '' }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract first 10 words for description
  const getDescription = (text: string): string => {
    const words = text.trim().split(/\s+/);
    if (words.length <= 10) {
      return text;
    }
    return words.slice(0, 10).join(' ') + '...';
  };

  const description = getDescription(thinking);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      {/* Header */}
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start px-0 py-1.5 hover:bg-transparent h-auto"
        >
          <div className="flex items-start gap-2.5 w-full min-w-0">
            <div className="flex items-center h-5">
              <ToolDot color="bg-purple-600 dark:bg-purple-400" />
            </div>
            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-sm font-semibold">Thinking</span>
              </div>
              <span className="text-xs text-muted-foreground">
                ↳ {description}
              </span>
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>

      {/* Content */}
      <CollapsibleContent>
        <div className="pl-5 pt-2 pb-3">
          <pre className="whitespace-pre-wrap break-words text-sm italic text-muted-foreground font-sans">
            {thinking}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
