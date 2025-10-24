/**
 * Dialog for creating a pull request
 * Pre-fills title and description from commits
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/client/components/ui/dialog';
import { Input } from '@/client/components/ui/input';
import { Textarea } from '@/client/components/ui/textarea';
import { Button } from '@/client/components/ui/button';
import { Label } from '@/client/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/ui/select';
import { Alert, AlertDescription } from '@/client/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { Skeleton } from '@/client/components/ui/skeleton';
import { usePrData, useCreatePr } from '../hooks/useGitOperations';

interface CreatePullRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | undefined;
  currentBranch: string | undefined;
}

export function CreatePullRequestDialog({
  open,
  onOpenChange,
  projectId,
  currentBranch,
}: CreatePullRequestDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');

  // Fetch PR pre-fill data when dialog opens
  const { data: prData, isLoading } = usePrData(projectId, baseBranch, open);

  // Create PR mutation
  const createPrMutation = useCreatePr();

  // Pre-fill form when prData loads
  useEffect(() => {
    if (prData) {
      setTitle(prData.title);
      setDescription(prData.description);
    }
  }, [prData]);

  const handleCreate = async () => {
    if (!projectId || !title.trim()) return;

    try {
      await createPrMutation.mutateAsync({
        projectId,
        title,
        description,
        baseBranch,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setTitle('');
      setDescription('');
      setBaseBranch('main');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Pull Request</DialogTitle>
          <DialogDescription>
            Create a pull request from{' '}
            <span className="font-mono font-semibold">{currentBranch}</span> to{' '}
            <span className="font-mono font-semibold">{baseBranch}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Base Branch Selection */}
          <div className="space-y-2">
            <Label htmlFor="base-branch">Base Branch</Label>
            <Select value={baseBranch} onValueChange={setBaseBranch}>
              <SelectTrigger id="base-branch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">main</SelectItem>
                <SelectItem value="master">master</SelectItem>
                <SelectItem value="develop">develop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="pr-title">Title</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input
                id="pr-title"
                placeholder="Pull request title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={createPrMutation.isPending}
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="pr-description">Description</Label>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <Textarea
                id="pr-description"
                placeholder="Pull request description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                disabled={createPrMutation.isPending}
                className="font-mono text-sm"
              />
            )}
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This will attempt to create the PR using GitHub CLI (gh). If not available, it will open
              the GitHub compare page in your browser.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {createPrMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {createPrMutation.error instanceof Error
                  ? createPrMutation.error.message
                  : 'Failed to create pull request'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createPrMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || createPrMutation.isPending || isLoading}
          >
            {createPrMutation.isPending ? 'Creating...' : 'Create Pull Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
