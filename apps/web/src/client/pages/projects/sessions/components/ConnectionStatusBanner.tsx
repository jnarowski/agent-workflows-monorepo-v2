import { useEffect, useState } from "react";
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
  // Debounce showing "Disconnected" state to prevent flashing during hot reload
  const [showDisconnected, setShowDisconnected] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState(connectionAttempts);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (readyState === ReadyState.CLOSED) {
      // Wait 2 seconds before showing disconnected banner
      // This prevents flashing during hot reload or quick reconnections
      timer = setTimeout(() => {
        setShowDisconnected(true);
      }, 2000);
    } else {
      // Connected or connecting - hide banner immediately
      setShowDisconnected(false);
    }

    return () => clearTimeout(timer);
  }, [readyState]);

  // Track if we're in auto-reconnection mode
  // Auto-reconnection happens when: CLOSED + connection attempts increasing
  useEffect(() => {
    if (connectionAttempts > previousAttempts) {
      setPreviousAttempts(connectionAttempts);
    }
  }, [connectionAttempts, previousAttempts]);

  // Detect if auto-reconnection is in progress
  // This happens when we were CLOSED and now CONNECTING with increasing attempts
  const isReconnecting =
    readyState === ReadyState.CONNECTING &&
    connectionAttempts > 1;

  // Don't show banner if no session
  if (!sessionId) {
    return null;
  }

  // Determine connection status message
  const getConnectionStatus = () => {
    if (readyState === ReadyState.CONNECTING && isReconnecting) {
      // Auto-reconnection in progress
      const attemptNumber = connectionAttempts - 1; // First attempt is 1, so subtract 1 for reconnect count
      return {
        message: `Reconnecting... (attempt ${Math.min(attemptNumber, 5)}/5)`,
        color: "yellow" as const,
        showReconnect: false,
      };
    } else if (readyState === ReadyState.CONNECTING) {
      // Initial connection
      return {
        message: "Connecting to session...",
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
    } else if ((readyState === ReadyState.CLOSING || readyState === ReadyState.CLOSED) && showDisconnected) {
      // Only show after debounce delay
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
