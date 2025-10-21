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
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        {/* Trigger */}
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-2 text-sm">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-foreground">
                Thinking...
              </span>
            </div>
          </Button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 border-t border-gray-200 dark:border-gray-800">
            <pre className="whitespace-pre-wrap break-words text-sm italic text-muted-foreground font-sans">
              {thinking}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
