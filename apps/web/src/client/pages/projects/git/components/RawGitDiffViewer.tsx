/**
 * Raw git diff viewer for git diff output
 * Shows additions in green, deletions in red with syntax highlighting
 */

import { SyntaxHighlighter } from '@/client/utils/syntaxHighlighter';

interface RawGitDiffViewerProps {
  diff: string;
  className?: string;
  showHeaders?: boolean;
}

export function RawGitDiffViewer({ diff, className = '', showHeaders = false }: RawGitDiffViewerProps) {
  // Filter out headers if showHeaders is false
  let processedDiff = diff;

  if (!showHeaders) {
    const lines = diff.split('\n');
    const filteredLines = lines.filter((line) => {
      // Skip git metadata lines
      return !(
        line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('--- ') ||
        line.startsWith('+++ ') ||
        line.startsWith('@@ ')
      );
    });
    processedDiff = filteredLines.join('\n');
  }

  return (
    <SyntaxHighlighter
      code={processedDiff}
      language="diff"
      showLineNumbers={false}
      className={`text-xs ${className}`}
    />
  );
}
