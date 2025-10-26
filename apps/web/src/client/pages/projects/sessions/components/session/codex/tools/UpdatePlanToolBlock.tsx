/**
 * Codex update_plan tool block
 * Displays plan updates and task tracking
 */

import { ToolCollapsibleWrapper } from '../../claude/ToolCollapsibleWrapper';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ToolInput } from '@/shared/types/message.types';

interface UpdatePlanToolBlockProps {
  input: ToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function UpdatePlanToolBlock({ input, result }: UpdatePlanToolBlockProps) {
  // Extract plan data from input
  const plan = (input.plan || input.content) as string | undefined;
  const planObject = typeof plan === 'string' ? plan : JSON.stringify(plan, null, 2);

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
      toolName="update_plan"
      contextInfo={null}
      description="Update execution plan"
      hasError={result?.is_error}
    >
      <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-3">
        {/* Plan content */}
        {planObject && (
          <div>
            <div className="text-muted-foreground font-semibold mb-2 font-mono">PLAN UPDATE</div>
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{planObject}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            <div className="border-t border-border" />
            <div className="flex gap-3 font-mono">
              <span className="text-muted-foreground font-semibold flex-shrink-0 w-16">RESULT</span>
              <pre
                className={`flex-1 whitespace-pre-wrap break-all ${
                  result.is_error ? 'text-destructive' : 'text-green-600 dark:text-green-400'
                }`}
              >
                {outputContent || 'Plan updated successfully'}
              </pre>
            </div>
          </>
        )}
      </div>
    </ToolCollapsibleWrapper>
  );
}
