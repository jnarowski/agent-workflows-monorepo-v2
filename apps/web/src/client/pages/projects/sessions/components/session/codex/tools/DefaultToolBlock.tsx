/**
 * Default/fallback tool block for unknown Codex tools
 * Displays generic tool input and result
 */

import { ToolCollapsibleWrapper } from '../../claude/ToolCollapsibleWrapper';
import type { ToolInput } from '@/shared/types/message.types';

interface DefaultToolBlockProps {
  toolName: string;
  toolId: string;
  input: ToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function DefaultToolBlock({ toolName, toolId, input, result }: DefaultToolBlockProps) {
  // Parse result
  let outputContent = result?.content || '';
  try {
    const parsed = JSON.parse(result?.content || '{}');
    outputContent = parsed.output || result?.content || '';
  } catch {
    outputContent = result?.content || '';
  }

  return (
    <ToolCollapsibleWrapper
      toolName={toolName}
      contextInfo={toolId.substring(0, 8)}
      description="Function call"
      hasError={result?.is_error}
    >
      <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono space-y-3">
        {/* Input */}
        <div>
          <div className="text-muted-foreground font-semibold mb-2">INPUT</div>
          <pre className="whitespace-pre-wrap break-all bg-background p-2 rounded border border-border">
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>

        {/* Result */}
        {result && (
          <>
            <div className="border-t border-border" />
            <div>
              <div className="text-muted-foreground font-semibold mb-2">OUTPUT</div>
              <pre
                className={`whitespace-pre-wrap break-all bg-background p-2 rounded border border-border ${
                  result.is_error ? 'text-destructive' : ''
                }`}
              >
                {outputContent}
              </pre>
            </div>
          </>
        )}
      </div>
    </ToolCollapsibleWrapper>
  );
}
