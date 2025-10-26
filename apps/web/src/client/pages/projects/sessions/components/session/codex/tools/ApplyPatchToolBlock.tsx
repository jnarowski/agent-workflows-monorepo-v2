/**
 * Codex apply_patch tool block
 * Displays file patch/diff operations
 */

import { ToolCollapsibleWrapper } from '../../claude/ToolCollapsibleWrapper';
import { CodeBlock } from '../../../CodeBlock';
import type { ToolInput } from '@/shared/types/message.types';

interface ApplyPatchToolBlockProps {
  input: ToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function ApplyPatchToolBlock({ input, result }: ApplyPatchToolBlockProps) {
  // Extract patch details from input
  const filePath = (input.file_path || input.path) as string | undefined;
  const patch = (input.patch || input.diff || input.content) as string | undefined;

  // Parse result
  let outputContent = result?.content || '';
  try {
    const parsed = JSON.parse(result?.content || '{}');
    outputContent = parsed.output || result?.content || '';
  } catch {
    outputContent = result?.content || '';
  }

  const contextInfo = filePath || 'unknown file';

  return (
    <ToolCollapsibleWrapper
      toolName="apply_patch"
      contextInfo={contextInfo}
      description="Apply patch to file"
      hasError={result?.is_error}
    >
      <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono space-y-3">
        {/* File path */}
        {filePath && (
          <div className="flex gap-3">
            <span className="text-muted-foreground font-semibold flex-shrink-0 w-16">FILE</span>
            <code className="flex-1 break-all text-purple-600 dark:text-purple-400">
              {filePath}
            </code>
          </div>
        )}

        {/* Patch content */}
        {patch && (
          <>
            <div className="border-t border-border" />
            <div>
              <div className="text-muted-foreground font-semibold mb-2">PATCH</div>
              <div className="max-h-64 overflow-y-auto">
                <CodeBlock code={patch} language="diff" showHeader={false} />
              </div>
            </div>
          </>
        )}

        {/* Result */}
        {result && (
          <>
            <div className="border-t border-border" />
            <div className="flex gap-3">
              <span className="text-muted-foreground font-semibold flex-shrink-0 w-16">RESULT</span>
              <pre
                className={`flex-1 whitespace-pre-wrap break-all ${
                  result.is_error ? 'text-destructive' : 'text-green-600 dark:text-green-400'
                }`}
              >
                {outputContent || 'Patch applied successfully'}
              </pre>
            </div>
          </>
        )}
      </div>
    </ToolCollapsibleWrapper>
  );
}
