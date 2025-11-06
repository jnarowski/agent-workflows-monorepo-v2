import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/client/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/client/components/ui/tabs';
import { Combobox } from '@/client/components/ui/combobox';
import { useCreateWorkflow } from '../hooks/useWorkflowMutations';
import { api } from '@/client/utils/api-client';
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
  const [specMode, setSpecMode] = useState<'file' | 'content'>('file');
  const [specFile, setSpecFile] = useState<string>('');
  const [specContent, setSpecContent] = useState('');
  const [branchFrom, setBranchFrom] = useState('');
  const [gitMode, setGitMode] = useState<'branch' | 'worktree'>('branch');
  const [branchName, setBranchName] = useState('');
  const [worktreeName, setWorktreeName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch available spec files
  const { data: specFiles } = useQuery({
    queryKey: ['projects', projectId, 'specs'],
    queryFn: async () => {
      const response = await api.get<{ data: string[] }>(
        `/api/projects/${projectId}/specs`
      );
      return response.data;
    },
    enabled: open && specMode === 'file',
  });

  // Fetch available branches
  const { data: branches } = useQuery({
    queryKey: ['projects', projectId, 'branches'],
    queryFn: async () => {
      const response = await api.get<{
        data: Array<{ name: string; current: boolean }>;
      }>(`/api/projects/${projectId}/branches`);
      return response.data;
    },
    enabled: open,
  });

  // Transform branches to combobox options
  const branchOptions = useMemo(() => {
    if (!branches) return [];
    return branches.map((branch) => ({
      value: branch.name,
      label: branch.name,
      badge: branch.current ? '(current)' : undefined,
    }));
  }, [branches]);

  // Auto-generate branch/worktree name from execution name
  useEffect(() => {
    if (name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (gitMode === 'branch') {
        setBranchName(slug);
      } else {
        setWorktreeName(slug);
      }
    }
  }, [name, gitMode]);

  const handleCreate = async () => {
    setError(null);

    // Validate name
    if (!name.trim()) {
      setError('Execution name is required');
      return;
    }

    // Validate spec (either file or content)
    if (specMode === 'file' && !specFile) {
      setError('Spec file is required');
      return;
    }
    if (specMode === 'content' && !specContent.trim()) {
      setError('Spec content is required');
      return;
    }

    // Validate git mode
    if (gitMode === 'branch' && !branchName.trim()) {
      setError('Branch name is required');
      return;
    }
    if (gitMode === 'worktree' && !worktreeName.trim()) {
      setError('Worktree name is required');
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
        spec_file: specMode === 'file' ? specFile : undefined,
        spec_content: specMode === 'content' ? specContent : undefined,
        branch_from: branchFrom || undefined,
        branch_name: gitMode === 'branch' ? branchName : undefined,
        worktree_name: gitMode === 'worktree' ? worktreeName : undefined,
      });

      // Navigate to new execution
      navigate(
        `/projects/${projectId}/workflows/${definitionId}/executions/${execution.id}`
      );

      // Reset form and close dialog
      setName('');
      setArgsJson('{}');
      setSpecFile('');
      setSpecContent('');
      setBranchFrom('');
      setBranchName('');
      setWorktreeName('');
      setError(null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create execution');
    }
  };

  const handleCancel = () => {
    setName('');
    setArgsJson('{}');
    setSpecFile('');
    setSpecContent('');
    setBranchFrom('');
    setBranchName('');
    setWorktreeName('');
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

      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
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

        {/* Spec selection */}
        <div className="space-y-2">
          <Label>Spec</Label>
          <Tabs value={specMode} onValueChange={(v) => setSpecMode(v as 'file' | 'content')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">File</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="space-y-2">
              <Select value={specFile} onValueChange={setSpecFile} disabled={createWorkflow.isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select spec file..." />
                </SelectTrigger>
                <SelectContent>
                  {specFiles && specFiles.length > 0 ? (
                    specFiles.map((file: string) => (
                      <SelectItem key={file} value={file}>
                        {file}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-specs" disabled>
                      No spec files found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select from .agent/specs/todo/
              </p>
            </TabsContent>
            <TabsContent value="content" className="space-y-2">
              <Textarea
                placeholder="Paste spec content here..."
                value={specContent}
                onChange={(e) => setSpecContent(e.target.value)}
                disabled={createWorkflow.isPending}
                className="font-mono text-sm"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Provide inline spec content
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Branch From (optional) */}
        <div className="space-y-2">
          <Label htmlFor="branch-from">Branch From (optional)</Label>
          <Combobox
            value={branchFrom}
            onValueChange={setBranchFrom}
            options={branchOptions}
            placeholder="Select branch (defaults to current)..."
            searchPlaceholder="Search branches..."
            emptyMessage="No branches found"
            disabled={createWorkflow.isPending}
            renderOption={(option, selected) => (
              <div className="flex items-center gap-2 flex-1">
                {selected && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4 shrink-0"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
                <span className="flex-1">{option.label}</span>
                {option.badge && (
                  <span className="text-xs text-muted-foreground">{option.badge}</span>
                )}
              </div>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Defaults to current branch if not specified
          </p>
        </div>

        {/* Git mode: branch or worktree */}
        <div className="space-y-2">
          <Label>Git Mode</Label>
          <RadioGroup value={gitMode} onValueChange={(v) => setGitMode(v as 'branch' | 'worktree')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="branch" id="mode-branch" />
              <Label htmlFor="mode-branch" className="font-normal cursor-pointer">
                Branch
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="worktree" id="mode-worktree" />
              <Label htmlFor="mode-worktree" className="font-normal cursor-pointer">
                Worktree
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Branch/Worktree Name (auto-generated from execution name) */}
        <div className="space-y-2">
          <Label htmlFor="git-name">
            {gitMode === 'branch' ? 'Branch Name' : 'Worktree Name'}
          </Label>
          <Input
            id="git-name"
            placeholder={`Auto-generated from execution name`}
            value={gitMode === 'branch' ? branchName : worktreeName}
            onChange={(e) =>
              gitMode === 'branch'
                ? setBranchName(e.target.value)
                : setWorktreeName(e.target.value)
            }
            disabled={createWorkflow.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Auto-generated, but you can edit
          </p>
        </div>

        {/* Args input */}
        <div className="space-y-2">
          <Label htmlFor="execution-args">
            Arguments (optional)
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
            rows={4}
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
