import { ReadyState } from "@/shared/types/websocket";

interface ConnectionStatusBannerProps {
  sessionId: string | null;
  readyState: ReadyState;
  isReady: boolean;
  connectionAttempts: number;
  onReconnect: () => void;
}

export function ConnectionStatusBanner({
  sessionId,
  readyState,
  isReady,
  connectionAttempts,
  onReconnect,
}: ConnectionStatusBannerProps) {
  // Don't show banner if no session
  if (!sessionId) {
    return null;
  }

  // Determine connection status message
  const getConnectionStatus = () => {
    if (readyState === ReadyState.CONNECTING) {
      return {
        message: `Connecting to session... (attempt ${connectionAttempts})`,
        color: "blue" as const,
        showReconnect: false,
      };
    } else if (readyState === ReadyState.OPEN && !isReady) {
      // Socket opened but waiting for global.connected message
      return {
        message: "Establishing session connection...",
        color: "blue" as const,
        showReconnect: false,
      };
    } else if (readyState === ReadyState.CLOSING || readyState === ReadyState.CLOSED) {
      return {
        message: "Disconnected from session",
        color: "yellow" as const,
        showReconnect: true,
      };
    }
    return null;
  };

  const status = getConnectionStatus();

  if (!status) {
    return null;
  }

  return (
    <div
      className={`border-b px-4 py-2 text-sm flex items-center justify-between ${
        status.color === "blue"
          ? "bg-blue-100 border-blue-200 text-blue-800"
          : "bg-yellow-100 border-yellow-200 text-yellow-800"
      }`}
    >
      <span>{status.message}</span>
      {status.showReconnect && (
        <button
          onClick={onReconnect}
          className={`underline hover:no-underline ${
            status.color === "blue" ? "text-blue-900" : "text-yellow-900"
          }`}
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
