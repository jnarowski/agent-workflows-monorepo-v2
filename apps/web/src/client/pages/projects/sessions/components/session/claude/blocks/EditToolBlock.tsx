/**
 * Edit tool block component
 */

import { Pencil } from 'lucide-react';
import { ToolCollapsibleWrapper } from '../ToolCollapsibleWrapper';
import { EditToolRenderer } from '../tools/EditToolRenderer';
import { ToolResultRenderer } from '../tools/ToolResultRenderer';
import type { EditToolInput } from '@/shared/types/tool.types';

interface EditToolBlockProps {
  input: EditToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function EditToolBlock({ input, result }: EditToolBlockProps) {
  // Extract filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };

  return (
    <ToolCollapsibleWrapper
      icon={Pencil}
      toolName="Edit"
      contextInfo={getFileName(input.file_path)}
    >
      {/* Tool Input */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Input:</div>
        <EditToolRenderer input={input} />
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
