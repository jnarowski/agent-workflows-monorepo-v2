/**
 * Main Source Control page for project git operations
 * Provides tabs for Changes and History views with full git workflow
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/client/components/ui/tabs';
import { GitTopBar } from './components/GitTopBar';
import { ChangesView } from './components/ChangesView';
import { HistoryView } from './components/HistoryView';
import {
  useGitStatus,
  useBranches,
  useCreateBranch,
  useSwitchBranch,
  useStageFiles,
  useUnstageFiles,
  useCommit,
  usePush,
  useFetch,
} from './hooks/useGitOperations';
import { useQueryClient } from '@tanstack/react-query';

export default function ProjectSourceControl() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Fetch git status and branches
  const { data: gitStatus } = useGitStatus(projectId);
  const { data: branches } = useBranches(projectId);

  // Mutations
  const createBranchMutation = useCreateBranch();
  const switchBranchMutation = useSwitchBranch();
  const stageFilesMutation = useStageFiles();
  const unstageFilesMutation = useUnstageFiles();
  const commitMutation = useCommit();
  const pushMutation = usePush();
  const fetchMutation = useFetch();

  // Tab state
  const [activeTab, setActiveTab] = useState<'changes' | 'history'>('changes');

  // Changes tab state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [commitMessage, setCommitMessage] = useState('');

  // History tab state
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());

  // Helper functions for Changes tab
  const handleToggleFile = (filepath: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filepath)) {
        next.delete(filepath);
      } else {
        next.add(filepath);
      }
      return next;
    });
  };

  const handleToggleFileExpand = (filepath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filepath)) {
        next.delete(filepath);
      } else {
        next.add(filepath);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (gitStatus?.files) {
      setSelectedFiles(new Set(gitStatus.files.map((f) => f.path)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleCommit = async () => {
    if (!projectId || selectedFiles.size === 0 || !commitMessage.trim()) return;

    try {
      // Stage selected files first
      await stageFilesMutation.mutateAsync({
        projectId,
        files: Array.from(selectedFiles),
      });

      // Then commit
      await commitMutation.mutateAsync({
        projectId,
        message: commitMessage,
        files: Array.from(selectedFiles),
      });

      // Clear selections and message on success
      setSelectedFiles(new Set());
      setCommitMessage('');
      setExpandedFiles(new Set());
    } catch (error) {
      // Error handling is done in the mutation hooks via toast
      console.error('Commit failed:', error);
    }
  };

  // Helper functions for History tab
  const handleToggleCommitExpand = (commitHash: string) => {
    setExpandedCommits((prev) => {
      const next = new Set(prev);
      if (next.has(commitHash)) {
        next.delete(commitHash);
      } else {
        next.add(commitHash);
      }
      return next;
    });
  };

  // GitTopBar callbacks
  const handleSwitchBranch = async (branchName: string) => {
    if (!projectId) return;
    await switchBranchMutation.mutateAsync({ projectId, name: branchName });
  };

  const handleCreateBranch = async (name: string, from?: string) => {
    if (!projectId) return;
    await createBranchMutation.mutateAsync({ projectId, name, from });
  };

  const handlePush = async () => {
    if (!projectId || !gitStatus?.branch) return;
    await pushMutation.mutateAsync({
      projectId,
      branch: gitStatus.branch,
    });
  };

  const handleFetch = async () => {
    if (!projectId) return;
    await fetchMutation.mutateAsync({ projectId });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['git', 'status', projectId] });
  };

  // Show not a git repo message if needed
  if (gitStatus && !gitStatus.isRepo) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground text-lg">Not a git repository</div>
          <p className="text-sm text-muted-foreground">
            Initialize git in this project to use source control features
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar with branch selector and actions */}
      <GitTopBar
        projectId={projectId}
        currentBranch={gitStatus?.branch}
        branches={branches}
        ahead={gitStatus?.ahead ?? 0}
        behind={gitStatus?.behind ?? 0}
        onSwitchBranch={handleSwitchBranch}
        onCreateBranch={handleCreateBranch}
        onPush={handlePush}
        onFetch={handleFetch}
        onRefresh={handleRefresh}
      />

      {/* Main content with tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'changes' | 'history')} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-4">
          <TabsTrigger value="changes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Changes
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            History
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="changes" className="h-full m-0">
            <ChangesView
              projectId={projectId}
              files={gitStatus?.files}
              selectedFiles={selectedFiles}
              expandedFiles={expandedFiles}
              commitMessage={commitMessage}
              onToggleFile={handleToggleFile}
              onToggleExpand={handleToggleFileExpand}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onCommitMessageChange={setCommitMessage}
              onCommit={handleCommit}
              isCommitting={commitMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="history" className="h-full m-0">
            <HistoryView
              projectId={projectId}
              expandedCommits={expandedCommits}
              onToggleExpand={handleToggleCommitExpand}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
