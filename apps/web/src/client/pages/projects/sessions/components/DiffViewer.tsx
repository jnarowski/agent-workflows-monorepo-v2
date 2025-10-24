/**
 * Side-by-side diff viewer for file changes
 * Shows additions in green, deletions in red
 */

import { diffLines, type Change } from 'diff';
import { FileEdit } from 'lucide-react';

interface DiffViewerProps {
  oldString: string;
  newString: string;
  filePath: string;
  className?: string;
}

export function DiffViewer({ oldString, newString, filePath, className = '' }: DiffViewerProps) {
  const changes = diffLines(oldString, newString);

  return (
    <div className={`rounded-lg border bg-muted/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <FileEdit className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm">{filePath}</span>
      </div>

      {/* Diff content */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <div className="font-mono text-xs">
          {changes.map((change, index) => (
            <DiffLine key={index} change={change} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DiffLineProps {
  change: Change;
}

function DiffLine({ change }: DiffLineProps) {
  const lines = change.value.split('\n');

  // Remove last empty line if present
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  if (change.added) {
    return (
      <>
        {lines.map((line, i) => (
          <div
            key={i}
            className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-0.5 border-l-2 border-green-500"
          >
            <span className="select-none mr-2">+</span>
            {line}
          </div>
        ))}
      </>
    );
  }

  if (change.removed) {
    return (
      <>
        {lines.map((line, i) => (
          <div
            key={i}
            className="bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-0.5 border-l-2 border-red-500"
          >
            <span className="select-none mr-2">-</span>
            {line}
          </div>
        ))}
      </>
    );
  }

  // Unchanged lines
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="text-muted-foreground px-4 py-0.5">
          <span className="select-none mr-2"> </span>
          {line}
        </div>
      ))}
    </>
  );
}
