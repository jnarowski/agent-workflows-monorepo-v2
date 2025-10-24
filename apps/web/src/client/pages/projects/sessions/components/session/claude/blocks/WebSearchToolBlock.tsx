/**
 * WebSearch tool block component
 */

import { Search } from 'lucide-react';
import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';
import { WebSearchToolRenderer } from '../tools/WebSearchToolRenderer';
import { ToolResultRenderer } from '../tools/ToolResultRenderer';
import type { WebSearchToolInput } from '@/shared/types/tool.types';

interface WebSearchToolBlockProps {
  input: WebSearchToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function WebSearchToolBlock({ input, result }: WebSearchToolBlockProps) {
  return (
    <ToolCollapsibleWrapper
      icon={Search}
      toolName="WebSearch"
      contextInfo={input.query}
    >
      {/* Tool Input */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Input:</div>
        <WebSearchToolRenderer input={input} />
      </div>

      {/* Tool Result */}
      {result && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Output:</div>
          <ToolResultRenderer result={result.content} isError={result.is_error} />
        </div>
      )}
    </ToolCollapsibleWrapper>
  );
}
