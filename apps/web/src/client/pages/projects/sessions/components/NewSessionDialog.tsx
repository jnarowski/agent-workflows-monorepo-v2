import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentSelector } from '@/client/components/AgentSelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui/button';
import type { AgentType } from '@/shared/types/agent.types';

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  projectId,
}: NewSessionDialogProps) {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('claude');

  const handleCreate = () => {
    // Navigate to new session page with agent param
    navigate(`/projects/${projectId}/session/new?agent=${selectedAgent}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Choose an AI agent to start a new coding session. Each agent has
            different capabilities and strengths.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AgentSelector
            value={selectedAgent}
            onChange={setSelectedAgent}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
