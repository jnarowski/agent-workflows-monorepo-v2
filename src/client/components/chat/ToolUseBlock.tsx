/**
 * Tool use block with expandable input/output
 * Shows tool calls with collapsible details
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ToolInputRenderer } from './tools/ToolInputRenderer';
import { ToolResultRenderer } from './tools/ToolResultRenderer';

interface ToolUseBlockProps {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: {
    content: string;
    is_error?: boolean;
  };
  className?: string;
}

export function ToolUseBlock({ id, name, input, result, className = '' }: ToolUseBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start px-4 py-3 hover:bg-blue-100 dark:hover:bg-blue-900/20"
          >
            <div className="flex items-center gap-2 w-full">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              )}
              <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <Badge variant="secondary" className="text-xs font-mono">
                {name}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono truncate">
                {id.slice(0, 8)}...
              </span>
            </div>
          </Button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 space-y-4 border-t border-blue-200 dark:border-blue-800">
            {/* Tool Input */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Input:</div>
              <ToolInputRenderer toolName={name} input={input} />
            </div>

            {/* Tool Result */}
            {result && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Output:</div>
                <ToolResultRenderer result={result.content} isError={result.is_error} />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
