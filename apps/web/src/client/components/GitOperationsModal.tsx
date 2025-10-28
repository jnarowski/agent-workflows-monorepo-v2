/**
 * Git Operations Modal
 * Provides quick access to common git operations from project header
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/client/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Button } from "@/client/components/ui/button";
import { LoadingButton } from "@/client/components/ui/loading-button";
import { Textarea } from "@/client/components/ui/textarea";
import { Label } from "@/client/components/ui/label";
import { Badge } from "@/client/components/ui/badge";
import { Separator } from "@/client/components/ui/separator";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import {
  GitBranch,
  GitCommit,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  AlertCircle,
  Check,
  Sparkles,
} from "lucide-react";
import {
  useGitStatus,
  useBranches,
  useSwitchBranch,
  useCreateBranch,
  useStageFiles,
  useCommit,
  usePush,
  usePull,
  useGenerateCommitMessage,
} from "@/client/pages/projects/git/hooks/useGitOperations";
import { CreateBranchDialog } from "@/client/pages/projects/git/components/CreateBranchDialog";

interface GitOperationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  currentBranch?: string;
}

export function GitOperationsModal({
  open,
  onOpenChange,
  projectPath,
  currentBranch,
}: GitOperationsModalProps) {
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  // Queries
  const { data: gitStatus } = useGitStatus(projectPath);
  const { data: branches } = useBranches(projectPath);

  // Mutations
  const switchBranchMutation = useSwitchBranch();
  const createBranchMutation = useCreateBranch();
  const stageFilesMutation = useStageFiles();
  const commitMutation = useCommit();
  const pushMutation = usePush();
  const pullMutation = usePull();
  const generateCommitMessageMutation = useGenerateCommitMessage();

  // Handlers
  const handleSwitchBranch = async (branchName: string) => {
    if (branchName === currentBranch) return;
    await switchBranchMutation.mutateAsync({
      path: projectPath,
      name: branchName,
    });
  };

  const handleCreateBranch = async (name: string, from?: string) => {
    await createBranchMutation.mutateAsync({
      path: projectPath,
      name,
      from,
    });
  };

  const handleGenerateCommitMessage = async () => {
    if (!gitStatus?.files?.length) return;

    const filePaths = gitStatus.files.map((f) => f.path);

    // Stage files first before generating commit message
    await stageFilesMutation.mutateAsync({
      path: projectPath,
      files: filePaths,
    });

    // Then generate the commit message based on staged changes
    const message = await generateCommitMessageMutation.mutateAsync({
      path: projectPath,
      files: filePaths,
    });

    setCommitMessage(message);
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !gitStatus?.files?.length) return;

    await commitMutation.mutateAsync({
      path: projectPath,
      message: commitMessage.trim(),
      files: gitStatus.files.map((f) => f.path),
    });

    // Clear message on success
    setCommitMessage("");
  };

  const handlePush = async () => {
    if (!currentBranch) return;
    await pushMutation.mutateAsync({
      path: projectPath,
      branch: currentBranch,
    });
  };

  const handlePull = async () => {
    await pullMutation.mutateAsync({
      path: projectPath,
      branch: currentBranch,
    });
  };

  const modifiedFilesCount = gitStatus?.files?.length || 0;
  const ahead = gitStatus?.ahead || 0;
  const behind = gitStatus?.behind || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Git Operations</DialogTitle>
            <DialogDescription>
              Quick access to common git operations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Branch Operations */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Branch</Label>
              <div className="flex gap-2">
                <Select
                  value={currentBranch}
                  onValueChange={handleSwitchBranch}
                >
                  <SelectTrigger className="flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch className="h-4 w-4 flex-shrink-0" />
                      <SelectValue placeholder="Select branch" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.name} value={branch.name}>
                        <div className="flex items-center gap-2">
                          <span>{branch.name}</span>
                          {branch.current && (
                            <Badge variant="outline" className="ml-auto">
                              <Check className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCreateBranchOpen(true)}
                  title="Create new branch"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Commit Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Commit Changes</Label>
                {modifiedFilesCount > 0 && (
                  <Badge variant="secondary">
                    {modifiedFilesCount}{" "}
                    {modifiedFilesCount === 1 ? "file" : "files"} changed
                  </Badge>
                )}
              </div>

              {modifiedFilesCount > 0 ? (
                <>
                  <Textarea
                    placeholder="Commit message..."
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    rows={3}
                    disabled={
                      commitMutation.isPending ||
                      generateCommitMessageMutation.isPending ||
                      stageFilesMutation.isPending
                    }
                  />
                  <div className="flex gap-2">
                    <LoadingButton
                      variant="outline"
                      onClick={handleGenerateCommitMessage}
                      disabled={modifiedFilesCount === 0}
                      isLoading={
                        stageFilesMutation.isPending ||
                        generateCommitMessageMutation.isPending
                      }
                      loadingText={
                        stageFilesMutation.isPending
                          ? "Staging..."
                          : "Generating..."
                      }
                      className="flex-1"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Commit
                    </LoadingButton>
                    <LoadingButton
                      onClick={handleCommit}
                      disabled={!commitMessage.trim()}
                      isLoading={commitMutation.isPending}
                      loadingText="Committing..."
                      className="flex-1"
                    >
                      <GitCommit className="h-4 w-4 mr-2" />
                      Commit
                    </LoadingButton>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No changes to commit</AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Push/Pull Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Remote Operations</Label>
              <div className="grid grid-cols-2 gap-2">
                <LoadingButton
                  variant="outline"
                  onClick={handlePush}
                  disabled={ahead === 0}
                  isLoading={pushMutation.isPending}
                  loadingText="Pushing..."
                  className="w-full"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Push
                  {ahead > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {ahead}
                    </Badge>
                  )}
                </LoadingButton>

                <LoadingButton
                  variant="outline"
                  onClick={handlePull}
                  isLoading={pullMutation.isPending}
                  loadingText="Pulling..."
                  className="w-full"
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Pull
                  {behind > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {behind}
                    </Badge>
                  )}
                </LoadingButton>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Branch Dialog */}
      <CreateBranchDialog
        open={createBranchOpen}
        onOpenChange={setCreateBranchOpen}
        currentBranch={currentBranch}
        onCreateBranch={handleCreateBranch}
      />
    </>
  );
}
