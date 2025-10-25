/**
 * Side-by-side diff viewer for file changes
 * Compares old vs new content and shows additions in green, deletions in red
 */

import { diffLines, type Change } from 'diff';

interface SideBySideDiffViewerProps {
  oldString: string;
  newString: string;
  filePath: string;
  className?: string;
}

export function SideBySideDiffViewer({ oldString, newString, filePath, className = '' }: SideBySideDiffViewerProps) {
  const changes = diffLines(oldString, newString);

  return (
    <div className={`rounded-lg border border-border bg-[#2a2a2a] overflow-hidden ${className}`}>
      {/* Diff content */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <div className="font-mono text-xs py-3">
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
            className="grid grid-cols-[24px_1fr] bg-green-500/15 text-green-400 py-0.5 border-l-2 border-green-500/50"
          >
            <span className="select-none text-center text-green-500">+</span>
            <span className="pr-4">{line}</span>
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
            className="grid grid-cols-[24px_1fr] bg-red-500/15 text-red-400 py-0.5 border-l-2 border-red-500/50"
          >
            <span className="select-none text-center text-red-500">-</span>
            <span className="pr-4">{line}</span>
          </div>
        ))}
      </>
    );
  }

  // Unchanged lines
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="grid grid-cols-[24px_1fr] text-gray-400 py-0.5">
          <span className="select-none"></span>
          <span className="pr-4">{line}</span>
        </div>
      ))}
    </>
  );
}
