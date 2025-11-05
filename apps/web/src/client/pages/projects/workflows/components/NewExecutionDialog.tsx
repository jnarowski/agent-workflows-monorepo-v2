import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseDialog } from '@/client/components/BaseDialog';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { Label } from '@/client/components/ui/label';
import { Textarea } from '@/client/components/ui/textarea';
import { useCreateWorkflow } from '../hooks/useWorkflowMutations';
import type { WorkflowDefinition } from '../types';

interface NewExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  definitionId: string;
  definition?: WorkflowDefinition;
}

export function NewExecutionDialog({
  open,
  onOpenChange,
  projectId,
  definitionId,
  definition,
}: NewExecutionDialogProps) {
  const navigate = useNavigate();
  const createWorkflow = useCreateWorkflow();

  const [name, setName] = useState('');
  const [argsJson, setArgsJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);

    // Validate name
    if (!name.trim()) {
      setError('Execution name is required');
      return;
    }

    // Parse and validate JSON args
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsJson);
      if (typeof args !== 'object' || Array.isArray(args)) {
        setError('Arguments must be a valid JSON object');
        return;
      }
    } catch {
      setError('Invalid JSON format for arguments');
      return;
    }

    try {
      const execution = await createWorkflow.mutateAsync({
        projectId,
        definitionId,
        name: name.trim(),
        args,
      });

      // Navigate to new execution
      navigate(
        `/projects/${projectId}/workflows/${definitionId}/executions/${execution.id}`
      );

      // Reset form and close dialog
      setName('');
      setArgsJson('{}');
      setError(null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create execution');
    }
  };

  const handleCancel = () => {
    setName('');
    setArgsJson('{}');
    setError(null);
    onOpenChange(false);
  };

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      contentProps={{ className: 'sm:max-w-[525px]' }}
    >
      <DialogHeader>
        <DialogTitle>New Workflow Execution</DialogTitle>
        <DialogDescription>
          {definition
            ? `Create a new execution of "${definition.name}"`
            : 'Create a new workflow execution'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Name input */}
        <div className="space-y-2">
          <Label htmlFor="execution-name">Execution Name</Label>
          <Input
            id="execution-name"
            placeholder="e.g., Feature Implementation - API v2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createWorkflow.isPending}
          />
        </div>

        {/* Args input */}
        <div className="space-y-2">
          <Label htmlFor="execution-args">
            Arguments
            {definition?.args_schema && (
              <span className="ml-2 text-xs text-muted-foreground">
                (JSON format)
              </span>
            )}
          </Label>
          <Textarea
            id="execution-args"
            placeholder='{"key": "value"}'
            value={argsJson}
            onChange={(e) => setArgsJson(e.target.value)}
            disabled={createWorkflow.isPending}
            className="font-mono text-sm"
            rows={6}
          />
          {definition?.description && (
            <p className="text-xs text-muted-foreground">
              {definition.description}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={createWorkflow.isPending}
        >
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={createWorkflow.isPending}>
          {createWorkflow.isPending ? 'Creating...' : 'Create Execution'}
        </Button>
      </DialogFooter>
    </BaseDialog>
  );
}
