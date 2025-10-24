/**
 * Dialog for creating a new git branch
 * Validates branch name and provides feedback
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/client/components/ui/dialog';
import { Input } from '@/client/components/ui/input';
import { Button } from '@/client/components/ui/button';
import { Label } from '@/client/components/ui/label';
import { Alert, AlertDescription } from '@/client/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBranch: string | undefined;
  onCreateBranch: (name: string, from?: string) => Promise<void>;
}

export function CreateBranchDialog({
  open,
  onOpenChange,
  currentBranch,
  onCreateBranch,
}: CreateBranchDialogProps) {
  const [branchName, setBranchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate branch name (no spaces, only alphanumeric, dash, underscore)
  const validateBranchName = (name: string): boolean => {
    if (!name) return false;
    // Allow alphanumeric, dash, underscore, forward slash (for feature/xyz)
    const validPattern = /^[a-zA-Z0-9/_-]+$/;
    return validPattern.test(name);
  };

  const isValid = validateBranchName(branchName);

  const handleCreate = async () => {
    if (!isValid) return;

    setError(null);
    setIsCreating(true);

    try {
      await onCreateBranch(branchName, currentBranch);
      // Reset form on success
      setBranchName('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setBranchName('');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
          <DialogDescription>
            Create a new branch from <span className="font-mono font-semibold">{currentBranch}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              placeholder="feature/my-new-feature"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid && !isCreating) {
                  handleCreate();
                }
              }}
              disabled={isCreating}
              autoFocus
            />
            {branchName && !isValid && (
              <p className="text-sm text-destructive">
                Branch name can only contain letters, numbers, dashes, underscores, and forward slashes
              </p>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The new branch will be created from the current branch and you will automatically switch to it.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!isValid || isCreating}>
            {isCreating ? 'Creating...' : 'Create Branch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
