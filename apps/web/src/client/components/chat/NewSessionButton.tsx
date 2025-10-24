import { useNavigate } from 'react-router-dom';
import { Button } from "@/client/components/ui/button";
import { Plus } from 'lucide-react';

interface NewSessionButtonProps {
  projectId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function NewSessionButton({ projectId, variant = 'default', size = 'default' }: NewSessionButtonProps) {
  const navigate = useNavigate();

  const handleCreateSession = () => {
    // Navigate to the new session route
    navigate(`/projects/${projectId}/session/new`);
  };

  return (
    <Button
      onClick={handleCreateSession}
      variant={variant}
      size={size}
      className="w-full"
    >
      <Plus className="h-4 w-4 mr-2" />
      New Session
    </Button>
  );
}
