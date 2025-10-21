/**
 * Renderer for Read tool input
 * Shows file reference with optional line range
 */

import { FileText } from 'lucide-react';
import type { ReadToolInput } from '../../../shared/types/chat';
import { FileReference } from '../FileReference';

interface ReadToolRendererProps {
  input: ReadToolInput;
}

export function ReadToolRenderer({ input }: ReadToolRendererProps) {
  const hasRange = input.offset !== undefined || input.limit !== undefined;
  const startLine = input.offset || 0;
  const endLine = input.limit ? startLine + input.limit : undefined;

  return (
    <div className="flex items-center gap-2">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Read:</span>
      <FileReference filePath={input.file_path} lineNumber={startLine > 0 ? startLine : undefined} />
      {hasRange && endLine && (
        <span className="text-xs text-muted-foreground">
          (lines {startLine}-{endLine})
        </span>
      )}
    </div>
  );
}
