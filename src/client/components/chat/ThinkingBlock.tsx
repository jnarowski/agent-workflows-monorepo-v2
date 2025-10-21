/**
 * Thinking/reasoning block
 * Collapsible display of Claude's internal reasoning
 */

import { useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';

interface ThinkingBlockProps {
  thinking: string;
  className?: string;
}

export function ThinkingBlock({ thinking, className = '' }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
        {/* Trigger */}
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start px-4 py-3 hover:bg-purple-100 dark:hover:bg-purple-900/20"
          >
            <div className="flex items-center gap-2 text-sm">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              )}
              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-purple-700 dark:text-purple-300">
                Thinking...
              </span>
            </div>
          </Button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-1 border-t border-purple-200 dark:border-purple-800">
            <pre className="whitespace-pre-wrap break-words text-sm italic text-purple-900 dark:text-purple-200 font-sans">
              {thinking}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
