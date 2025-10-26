/**
 * Codex reasoning/thinking block
 * Collapsible display of Codex's reasoning summary
 * Note: Codex encrypts full reasoning content, only summary is visible
 */

import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/client/components/ui/collapsible';

interface CodexReasoningBlockProps {
  thinking: string;
  className?: string;
}

export function CodexReasoningBlock({ thinking, className = '' }: CodexReasoningBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract first sentence for preview
  const getFirstSentence = (text: string): string => {
    const match = text.match(/^[^.!?]+[.!?]/);
    if (match) {
      return match[0].trim();
    }
    return text.slice(0, 100) + (text.length > 100 ? '...' : '');
  };

  const description = getFirstSentence(thinking);

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
              <div className="h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400" />
            </div>
            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-sm font-semibold">Reasoning</span>
                <span className="text-xs text-purple-600 dark:text-purple-400">(Summary)</span>
              </div>
              <span className="text-xs text-muted-foreground break-words max-w-full overflow-hidden">
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
          <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 opacity-70">
            Note: Full reasoning content is encrypted by Codex. Only summary is shown.
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
