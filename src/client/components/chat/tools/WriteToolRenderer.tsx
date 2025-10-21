/**
 * Renderer for Write tool input
 * Shows file path and new file content
 */

import type { WriteToolInput } from '../../../shared/types/chat';
import { FileReference } from '../FileReference';
import { CodeBlock } from '../CodeBlock';
import { getLanguageFromPath } from '../../../utils/getLanguageFromPath';

interface WriteToolRendererProps {
  input: WriteToolInput;
}

export function WriteToolRenderer({ input }: WriteToolRendererProps) {
  const language = getLanguageFromPath(input.file_path);
  const lineCount = input.content.split('\n').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">New file:</span>
        <FileReference filePath={input.file_path} />
      </div>
      <CodeBlock
        code={input.content}
        language={language}
        collapsedByDefault={lineCount > 20}
      />
    </div>
  );
}
