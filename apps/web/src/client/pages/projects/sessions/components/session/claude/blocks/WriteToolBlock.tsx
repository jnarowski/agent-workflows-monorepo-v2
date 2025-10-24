/**
 * Write tool block component
 */

import { FileEdit } from 'lucide-react';
import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';
import { WriteToolRenderer } from '../tools/WriteToolRenderer';
import { ToolResultRenderer } from '../tools/ToolResultRenderer';
import type { WriteToolInput } from '@/shared/types/tool.types';

interface WriteToolBlockProps {
  input: WriteToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function WriteToolBlock({ input, result }: WriteToolBlockProps) {
  // Extract filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };

  return (
    <ToolCollapsibleWrapper
      icon={FileEdit}
      toolName="Write"
      contextInfo={getFileName(input.file_path)}
    >
      {/* Tool Input */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Input:</div>
        <WriteToolRenderer input={input} />
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
