/**
 * Top bar component with branch selector and git action buttons
 */

import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { Badge } from '@/client/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/client/components/ui/select';
import { GitBranch, ArrowUpCircle, ArrowDownCircle, RefreshCw, GitPullRequest } from 'lucide-react';
import { CreateBranchDialog } from './CreateBranchDialog';
import { CreatePullRequestDialog } from './CreatePullRequestDialog';
import type { GitBranch as GitBranchType } from '@/shared/types/git.types';

interface GitTopBarProps {
  projectId: string | undefined;
  currentBranch: string | undefined;
  branches: GitBranchType[] | undefined;
  ahead: number;
  behind: number;
  onSwitchBranch: (branchName: string) => void;
  onCreateBranch: (name: string, from?: string) => Promise<void>;
  onPush: () => void;
  onFetch: () => void;
  onRefresh: () => void;
}

export function GitTopBar({
  projectId,
  currentBranch,
  branches,
  ahead,
  behind,
  onSwitchBranch,
  onCreateBranch,
  onPush,
  onFetch,
  onRefresh,
}: GitTopBarProps) {
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [createPrOpen, setCreatePrOpen] = useState(false);

  const handleBranchSelect = (value: string) => {
    if (value === '__create__') {
      setCreateBranchOpen(true);
    } else {
      onSwitchBranch(value);
    }
  };

  const handleCreateBranch = async (name: string, from?: string) => {
    await onCreateBranch(name, from);
    setCreateBranchOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side - Branch selector */}
      <div className="flex items-center gap-2">
        <Select value={currentBranch} onValueChange={handleBranchSelect}>
          <SelectTrigger className="w-[200px]">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <SelectValue placeholder="Select branch" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {branches?.map((branch) => (
              <SelectItem key={branch.name} value={branch.name}>
                <div className="flex items-center gap-2">
                  {branch.name}
                  {branch.current && <Badge variant="outline" className="ml-2">Current</Badge>}
                </div>
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value="__create__">
              <div className="flex items-center gap-2 text-primary">
                <span>+ Create new branch</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center gap-2">
        {/* Push button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPush}
          disabled={ahead === 0}
          className="relative"
        >
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          Push
          {ahead > 0 && (
            <Badge variant="default" className="ml-2 h-5 px-1.5">
              {ahead}
            </Badge>
          )}
        </Button>

        {/* Fetch button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onFetch}
          className="relative"
        >
          <ArrowDownCircle className="h-4 w-4 mr-2" />
          Fetch
          {behind > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              {behind}
            </Badge>
          )}
        </Button>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>

        {/* Create PR button - only show if ahead */}
        {ahead > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreatePrOpen(true)}
          >
            <GitPullRequest className="h-4 w-4 mr-2" />
            Create PR
          </Button>
        )}
      </div>

      {/* Dialogs */}
      <CreateBranchDialog
        open={createBranchOpen}
        onOpenChange={setCreateBranchOpen}
        currentBranch={currentBranch}
        onCreateBranch={handleCreateBranch}
      />

      <CreatePullRequestDialog
        open={createPrOpen}
        onOpenChange={setCreatePrOpen}
        projectId={projectId}
        currentBranch={currentBranch}
      />
    </div>
  );
}
