import { Button } from '../ui/button';
import type { ConnectionStatus } from '../../contexts/ShellContext';

interface ShellControlsProps {
  status: ConnectionStatus;
  projectName?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onRestart?: () => void;
}

export function ShellControls({
  status,
  projectName,
  onConnect,
  onDisconnect,
  onRestart,
}: ShellControlsProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>

        {/* Project name */}
        {projectName && (
          <>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              Project: <span className="font-medium text-foreground">{projectName}</span>
            </span>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {status === 'disconnected' || status === 'error' ? (
          <Button
            size="sm"
            variant="default"
            onClick={onConnect}
            disabled={!onConnect}
          >
            Connect
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onDisconnect}
            disabled={!onDisconnect}
          >
            Disconnect
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={onRestart}
          disabled={!onRestart || status === 'connecting'}
        >
          Restart
        </Button>
      </div>
    </div>
  );
}
