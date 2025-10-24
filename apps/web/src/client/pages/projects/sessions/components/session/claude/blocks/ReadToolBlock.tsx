/**
 * Read tool block component
 */

import { Eye } from 'lucide-react';
import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';
import { ReadToolRenderer } from '../tools/ReadToolRenderer';
import { ToolResultRenderer } from '../tools/ToolResultRenderer';
import type { ReadToolInput } from '@/shared/types/tool.types';

interface ReadToolBlockProps {
  input: ReadToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function ReadToolBlock({ input, result }: ReadToolBlockProps) {
  // Extract filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };

  return (
    <ToolCollapsibleWrapper
      icon={Eye}
      toolName="Read"
      contextInfo={getFileName(input.file_path)}
    >
      {/* Tool Input */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Input:</div>
        <ReadToolRenderer input={input} />
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
