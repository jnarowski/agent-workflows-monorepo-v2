/**
 * TodoWrite tool block component
 */

import { CheckSquare } from 'lucide-react';
import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';
import { TodoWriteToolRenderer } from '../tools/TodoWriteToolRenderer';
import { ToolResultRenderer } from '../tools/ToolResultRenderer';
import type { TodoWriteToolInput } from '@/shared/types/tool.types';

interface TodoWriteToolBlockProps {
  input: TodoWriteToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function TodoWriteToolBlock({ input, result }: TodoWriteToolBlockProps) {
  // Calculate completion count
  const getContextInfo = (): string => {
    const completedCount = input.todos.filter(t => t.status === 'completed').length;
    return `${completedCount} / ${input.todos.length} todos completed`;
  };

  return (
    <ToolCollapsibleWrapper
      icon={CheckSquare}
      toolName="TodoWrite"
      contextInfo={getContextInfo()}
    >
      {/* Tool Input */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Input:</div>
        <TodoWriteToolRenderer input={input} />
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
