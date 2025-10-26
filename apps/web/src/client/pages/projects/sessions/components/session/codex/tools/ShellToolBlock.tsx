/**
 * Codex shell tool block
 * Displays shell command execution (similar to Bash tool in Claude)
 */

import { useState } from 'react';
import { ToolCollapsibleWrapper } from '../../claude/ToolCollapsibleWrapper';
import type { ToolInput } from '@/shared/types/message.types';

interface ShellToolBlockProps {
  input: ToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 3;

export function ShellToolBlock({ input, result }: ShellToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract command from input
  // Codex shell command can be array or string
  const command = input.command as string[] | string | undefined;
  const commandStr = Array.isArray(command) ? command.join(' ') : command || 'unknown';
  const workdir = input.workdir as string | undefined;

  // Parse result to extract output and metadata
  let outputContent = result?.content || '';
  let exitCode: number | undefined;
  let duration: number | undefined;

  try {
    const parsed = JSON.parse(result?.content || '{}');
    if (parsed.output) {
      outputContent = parsed.output;
    }
    if (parsed.metadata) {
      exitCode = parsed.metadata.exit_code;
      duration = parsed.metadata.duration_seconds;
    }
  } catch {
    // If parsing fails, use raw content
    outputContent = result?.content || '';
  }

  // Check if output should be truncated
  const outputLines = outputContent.split('\n');
  const shouldTruncate = outputLines.length > MAX_LINES_PREVIEW;
  const displayContent =
    shouldTruncate && !isExpanded
      ? outputLines.slice(0, MAX_LINES_PREVIEW).join('\n')
      : outputContent;

  // Build context info
  const contextParts: string[] = [];
  if (workdir) {
    contextParts.push(workdir);
  }
  if (exitCode !== undefined) {
    contextParts.push(`exit: ${exitCode}`);
  }
  if (duration !== undefined) {
    contextParts.push(`${duration.toFixed(2)}s`);
  }
  const contextInfo = contextParts.length > 0 ? contextParts.join(' • ') : null;

  return (
    <ToolCollapsibleWrapper
      toolName="shell"
      contextInfo={contextInfo}
      description={commandStr.length > 80 ? commandStr.substring(0, 80) + '...' : commandStr}
      hasError={result?.is_error || (exitCode !== undefined && exitCode !== 0)}
    >
      <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
        {/* IN section - command */}
        <div className="flex gap-3">
          <span className="text-muted-foreground font-semibold flex-shrink-0 w-8">IN</span>
          <code className="flex-1 break-all">{commandStr}</code>
        </div>

        {/* Show workdir if present */}
        {workdir && (
          <div className="flex gap-3 mt-1 text-purple-600 dark:text-purple-400">
            <span className="text-muted-foreground font-semibold flex-shrink-0 w-8">@</span>
            <code className="flex-1 break-all">{workdir}</code>
          </div>
        )}

        {/* Divider */}
        {result && <div className="border-t border-border my-2" />}

        {/* OUT section */}
        {result && (
          <div className="flex gap-3 relative">
            <span className="text-muted-foreground font-semibold flex-shrink-0 w-8">OUT</span>
            <div className="flex-1 relative">
              <pre
                className={`whitespace-pre-wrap break-all ${
                  result.is_error || (exitCode !== undefined && exitCode !== 0)
                    ? 'text-destructive'
                    : ''
                }`}
              >
                {displayContent}
              </pre>

              {/* Exit code and duration info */}
              {(exitCode !== undefined || duration !== undefined) && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {exitCode !== undefined && (
                    <span
                      className={
                        exitCode === 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      Exit code: {exitCode}
                    </span>
                  )}
                  {duration !== undefined && (
                    <span className="ml-3">Duration: {duration.toFixed(2)}s</span>
                  )}
                </div>
              )}

              {/* Expand button */}
              {shouldTruncate && !isExpanded && (
                <button
                  className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border hover:bg-muted/50 cursor-pointer mt-1"
                  onClick={() => setIsExpanded(true)}
                >
                  Click to expand ({outputLines.length} lines)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolCollapsibleWrapper>
  );
}
