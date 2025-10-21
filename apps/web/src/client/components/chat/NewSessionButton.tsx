import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { useChatContext } from '../../contexts/ChatContext';

interface NewSessionButtonProps {
  projectId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function NewSessionButton({ projectId, variant = 'default', size = 'default' }: NewSessionButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { createSession } = useChatContext();

  const handleCreateSession = async () => {
    try {
      setIsCreating(true);

      // Generate UUID for the new session
      const sessionId = crypto.randomUUID();

      // Call API to create session
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      // Add to context
      createSession(sessionId);

      // Navigate to new session
      navigate(`/projects/${projectId}/chat/${sessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      // TODO: Show error toast/notification
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreateSession}
      disabled={isCreating}
      variant={variant}
      size={size}
      className="w-full"
    >
      <Plus className="h-4 w-4 mr-2" />
      {isCreating ? 'Creating...' : 'New Session'}
    </Button>
  );
}
