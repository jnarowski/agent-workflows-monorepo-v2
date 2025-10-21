/**
 * Renderer for tool results
 * Shows output with error/success styling
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';

interface ToolResultRendererProps {
  result: string;
  isError?: boolean;
}

const MAX_LENGTH_BEFORE_COLLAPSE = 500;

export function ToolResultRenderer({ result, isError = false }: ToolResultRendererProps) {
  const shouldCollapse = result.length > MAX_LENGTH_BEFORE_COLLAPSE;
  const [isOpen, setIsOpen] = useState(!shouldCollapse);

  const Icon = isError ? AlertCircle : CheckCircle2;
  const iconColor = isError ? 'text-red-500' : 'text-green-500';

  const content = (
    <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
        <Icon className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
        <span className="text-sm font-medium">
          {isError ? 'Error' : 'Success'}
        </span>
        {shouldCollapse && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 rounded-sm">
              {isOpen ? (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronRight className="h-3 w-3 mr-1" />
                  Expand
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
        <pre className="font-mono text-xs whitespace-pre-wrap break-words">
          {result}
        </pre>
      </div>
    </div>
  );

  if (shouldCollapse) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return content;
}
