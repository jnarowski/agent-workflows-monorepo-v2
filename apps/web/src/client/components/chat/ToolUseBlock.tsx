/**
 * Tool use block with expandable input/output
 * Shows tool calls with collapsible details
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, Loader2 } from 'lucide-react';
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/client/components/ui/collapsible";
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
  const isPending = result === undefined;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-2 w-full">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <Badge variant="secondary" className="text-xs font-mono">
                {name}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono truncate">
                {id.slice(0, 8)}...
              </span>
              {isPending && (
                <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Running...
                </div>
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-3 border-t border-gray-200 dark:border-gray-800">
            {/* Tool Input */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Input:</div>
              <ToolInputRenderer toolName={name} input={input} />
            </div>

            {/* Tool Result */}
            {result && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Output:</div>
                <ToolResultRenderer result={result.content} isError={result.is_error} />
              </div>
            )}

            {isPending && (
              <div className="text-sm text-muted-foreground italic">
                Waiting for result...
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
