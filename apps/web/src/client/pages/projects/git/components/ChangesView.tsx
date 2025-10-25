/**
 * Changes view showing uncommitted files with inline diffs
 */

import { Button } from '@/client/components/ui/button';
import { Textarea } from '@/client/components/ui/textarea';
import { FileChangeItem } from './FileChangeItem';
import { CheckCircle2 } from 'lucide-react';
import type { GitFileStatus } from '@/shared/types/git.types';

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

      {/* File list section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectedFiles.size === files.length ? onDeselectAll : onSelectAll}
            className="h-8 text-xs"
          >
            {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
          </Button>
          <div className="text-xs text-muted-foreground">
            {files.length} {files.length === 1 ? 'changed file' : 'changed files'}
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2">
          {files.map((file) => (
            <FileChangeItem
              key={file.path}
              file={file}
              selected={selectedFiles.has(file.path)}
              expanded={expandedFiles.has(file.path)}
              projectId={projectId}
              onToggle={() => onToggleFile(file.path)}
              onToggleExpand={() => onToggleExpand(file.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
