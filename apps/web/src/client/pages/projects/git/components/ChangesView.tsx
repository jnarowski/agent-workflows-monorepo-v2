/**
 * Changes view showing uncommitted files with inline diffs
 */

import { Button } from '@/client/components/ui/button';
import { Textarea } from '@/client/components/ui/textarea';
import { CheckCircle2 } from 'lucide-react';
import type { GitFileStatus } from '@/shared/types/git.types';
import { DataTable } from '@/client/components/ui/data-table';
import { createGitChangesColumns } from './git-changes-columns';
import type { Row } from '@tanstack/react-table';
import { RawGitDiffViewer } from './RawGitDiffViewer';
import { useFileDiff } from '../hooks/useGitOperations';
import { Skeleton } from '@/client/components/ui/skeleton';
import { useMemo } from 'react';

interface ChangesViewProps {
  projectId: string | undefined;
  files: GitFileStatus[] | undefined;
  selectedFiles: Set<string>;
  expandedFiles: Set<string>;
  commitMessage: string;
  onToggleFile: (filepath: string) => void;
  onToggleExpand: (filepath: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCommitMessageChange: (message: string) => void;
  onCommit: () => void;
  isCommitting?: boolean;
}

// Diff content component for expanded rows
function DiffContent({
  projectId,
  file,
}: {
  projectId: string | undefined;
  file: GitFileStatus;
}) {
  const { data: diff, isLoading } = useFileDiff(projectId, file.path);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No diff available</p>
      </div>
    );
  }

  // Check if it's a binary file or has actual diff content
  if (diff.includes('Binary files')) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Binary file - cannot display diff</p>
      </div>
    );
  }

  if (diff.trim() === '') {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No changes to display</p>
      </div>
    );
  }

  return <RawGitDiffViewer diff={diff} />;
}

export function ChangesView({
  projectId,
  files,
  selectedFiles,
  expandedFiles,
  commitMessage,
  onToggleFile,
  onToggleExpand,
  onSelectAll,
  onDeselectAll,
  onCommitMessageChange,
  onCommit,
  isCommitting,
}: ChangesViewProps) {
  const canCommit = selectedFiles.size > 0 && commitMessage.trim().length > 0;

  // Create columns with selection handlers
  const columns = useMemo(
    () =>
      createGitChangesColumns(
        selectedFiles,
        onToggleFile,
        onSelectAll,
        onDeselectAll,
        files?.length || 0
      ),
    [selectedFiles, onToggleFile, onSelectAll, onDeselectAll, files?.length]
  );

  // Empty state
  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
          <div className="text-muted-foreground text-lg">No changes detected</div>
          <p className="text-sm text-muted-foreground">
            All changes have been committed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Commit message section */}
      <div className="flex-shrink-0 px-4 py-4 border-b space-y-3 bg-background">
        <div className="space-y-2">
          <label htmlFor="commit-message" className="text-sm font-medium">
            Commit message
          </label>
          <Textarea
            id="commit-message"
            placeholder="Enter commit message..."
            value={commitMessage}
            onChange={(e) => onCommitMessageChange(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedFiles.size} {selectedFiles.size === 1 ? 'file' : 'files'} selected
          </div>
          <Button
            onClick={onCommit}
            disabled={!canCommit || isCommitting}
            size="sm"
          >
            {isCommitting ? 'Committing...' : `Commit (${selectedFiles.size})`}
          </Button>
        </div>
      </div>

      {/* File list section with DataTable */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        <DataTable
          columns={columns}
          data={files}
          getRowId={(row) => row.path}
          renderExpandedRow={(row: Row<GitFileStatus>) => (
            <DiffContent projectId={projectId} file={row.original} />
          )}
        />
      </div>
    </div>
  );
}
